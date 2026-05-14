import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma';
import {
  BookingStatus,
  EventStatus,
  Prisma,
  SeatHoldStatus,
} from 'src/generated/prisma/client';
import { PaymentsService } from 'src/payments';

@Injectable()
export class BookingsService {
  private readonly MAX_EVENT_TICKETS_PER_DAY = 5;
  private readonly BOOKING_PAYMENT_TIME = 10 * 60 * 1000;
  private readonly HOLD_EXPIRE_TIME = 1 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async holdSeats(userId: number, eventId: number, ticketQuantity: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const eventRows = await tx.$queryRaw<any[]>`
          SELECT * FROM "event"
          WHERE id = ${eventId}
          FOR UPDATE
        `;

        const event = eventRows[0];

        if (!event) {
          throw new Error('Event not found');
        }

        if (event.status !== EventStatus.Active.toLowerCase()) {
          throw new Error('Event is inactive');
        }

        await tx.seatHold.updateMany({
          where: {
            status: SeatHoldStatus.Hold,
            expiresAt: {
              lt: new Date(),
            },
          },
          data: {
            status: SeatHoldStatus.Expired,
          },
        });

        const existingHold = await tx.seatHold.findFirst({
          where: {
            userId,
            eventId,
            status: {
              in: [SeatHoldStatus.Hold, SeatHoldStatus.Processing],
            },
          },
        });

        if (existingHold) {
          throw new Error(`Already holding seats with id ${existingHold.id}`);
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayBooked = await tx.booking.aggregate({
          where: {
            userId,
            eventId,
            status: BookingStatus.Confirmed,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          _sum: {
            quantity: true,
          },
        });

        const todayHold = await tx.seatHold.aggregate({
          where: {
            userId,
            eventId,
            expiresAt: {
              gt: new Date(),
            },
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          _sum: {
            quantity: true,
          },
        });

        const bookedQty = todayBooked._sum.quantity || 0;
        const holdQty = todayHold._sum.quantity || 0;
        const totalTodayTotalSeatsBooked = bookedQty + holdQty;

        if (
          totalTodayTotalSeatsBooked + ticketQuantity >
          this.MAX_EVENT_TICKETS_PER_DAY
        ) {
          throw new Error(
            `Maximum ${this.MAX_EVENT_TICKETS_PER_DAY} tickets allowed per event per day`,
          );
        }

        const activeHolds = await tx.seatHold.aggregate({
          where: {
            eventId,
            status: {
              in: [SeatHoldStatus.Hold, SeatHoldStatus.Processing],
            },
            OR: [
              {
                expiresAt: {
                  gt: new Date(),
                },
              },
              {
                processingExpiresAt: {
                  gt: new Date(),
                },
              },
            ],
          },
          _sum: {
            quantity: true,
          },
        });

        const holdSeats = activeHolds._sum?.quantity ?? 0;

        const availableSeats = event.totalSeats - event.bookedSeats - holdSeats;

        if (availableSeats < ticketQuantity) {
          throw new Error('Seats unavailable');
        }

        const hold = await tx.seatHold.create({
          data: {
            userId,
            eventId,
            quantity: ticketQuantity,
            status: SeatHoldStatus.Hold,
            expiresAt: new Date(Date.now() + this.HOLD_EXPIRE_TIME),
          },
        });

        return {
          status: 'success',
          holdId: hold.id,
          expiresAt: hold.expiresAt,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async book(userId: number, holdId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const holdRows = await tx.$queryRaw<any[]>`
          SELECT * FROM "seat_hold"
          WHERE id = ${holdId}
          FOR UPDATE
        `;

        const hold = holdRows[0];

        if (!hold) {
          throw new Error('Hold not found');
        }

        if (hold.userId !== userId) {
          throw new Error('Unauthorized');
        }

        if (hold.status === SeatHoldStatus.Completed.toLowerCase()) {
          throw new Error('Booking already completed');
        }

        if (hold.status === SeatHoldStatus.Expired.toLowerCase()) {
          throw new Error('Hold expired');
        }

        if (hold.expiresAt < new Date()) {
          await tx.seatHold.update({
            where: {
              id: hold.id,
            },
            data: {
              status: SeatHoldStatus.Expired,
            },
          });

          throw new Error('Hold expired');
        }

        const event = await tx.event.findUnique({
          where: {
            id: hold.eventId,
          },
        });

        if (!event) {
          throw new Error('Event not found');
        }

        const total = hold.quantity * event.price;

        await tx.seatHold.update({
          where: {
            id: hold.id,
          },
          data: {
            status: SeatHoldStatus.Processing,
            paymentStartedAt: new Date(),
            processingExpiresAt: new Date(
              Date.now() + this.BOOKING_PAYMENT_TIME,
            ),
          },
        });

        const booking = await tx.booking.create({
          data: {
            userId,
            eventId: hold.eventId,
            quantity: hold.quantity,
            total,
            status: BookingStatus.Pending,
          },
        });

        const settlement = await this.paymentsService.processBookingPayment(
          tx,
          {
            bookingId: booking.id,
            userId,
            managerId: event.managerId,
            eventId: event.id,
            quantity: hold.quantity,
            total,
          },
        );

        await tx.seatHold.update({
          where: {
            id: hold.id,
          },
          data: {
            status: SeatHoldStatus.Completed,
            bookingId: booking.id,
          },
        });

        return {
          status: 'success',
          bookingId: booking.id,
          settlement,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
