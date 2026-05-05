import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AuthenticatedUser } from '@Common';
import { PaymentsService } from 'src/payments/payments.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus } from 'src/generated/prisma/enums';

@Injectable()
export class BookingsService {
  private readonly MAX_TICKETS_PER_DAY = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async clearExpiredSeatHolds() {
    const holdDelete = await this.prisma.seatHold.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (holdDelete.count > 0) {
      console.info(`${holdDelete.count} seat holds released`);
    }
  }

  async holdSeats(ctx: AuthenticatedUser, data: CreateBookingDto) {
    return await this.prisma.$transaction(async (tx) => {
      const eventRows = await tx.$queryRaw<any[]>`
          SELECT * FROM "Event"
          WHERE id = ${data.eventId}
          FOR UPDATE
        `;

      const event = eventRows[0];

      if (!event || event.status !== 'Active') {
        throw new Error('Event not active');
      }

      await tx.seatHold.deleteMany({
        where: {
          eventId: data.eventId,
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayBooked = await tx.booking.aggregate({
        where: {
          userId: ctx.id,
          eventId: data.eventId,
          status: BookingStatus.CONFIRMED,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        _sum: {
          quantity: true,
        },
      });

      const todayHeld = await tx.seatHold.aggregate({
        where: {
          userId: ctx.id,
          eventId: data.eventId,
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
      const heldQty = todayHeld._sum.quantity || 0;
      const totalTodayTotalSeatsBooked = bookedQty + heldQty;

      if (
        totalTodayTotalSeatsBooked + data.ticketQuantity >
        this.MAX_TICKETS_PER_DAY
      ) {
        throw new Error(
          `Maximum ${this.MAX_TICKETS_PER_DAY} tickets allowed per event per day`,
        );
      }

      const activeHolds = await tx.seatHold.aggregate({
        where: {
          eventId: data.eventId,
          expiresAt: {
            gt: new Date(),
          },
        },
        _sum: {
          quantity: true,
        },
      });

      const holdSeats = activeHolds._sum.quantity || 0;

      if (data.ticketQuantity > event.totalSeats) {
        throw new Error('Not enough seats available');
      }

      const availableSeats = event.totalSeats - event.bookedSeats - holdSeats;

      if (availableSeats < data.ticketQuantity) {
        throw new Error('Seats temporarily unavailable');
      }

      const existingUserHold = await tx.seatHold.findFirst({
        where: {
          userId: ctx.id,
          eventId: data.eventId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingUserHold) {
        throw new Error('You already have an active seat hold for this event');
      }

      const hold = await tx.seatHold.create({
        data: {
          userId: ctx.id,
          eventId: data.eventId,
          quantity: data.ticketQuantity,
          expiresAt: new Date(Date.now() + 1 * 60 * 1000),
        },
      });

      return {
        status: 'success',
        holdId: hold.id,
        expiresAt: hold.expiresAt,
        message: 'Seat held for 1 minute',
      };
    });
  }

  async book(ctx: AuthenticatedUser, holdId: number) {
    return await this.prisma.$transaction(async (tx) => {
      const hold = await tx.seatHold.findUnique({
        where: { id: holdId },
        include: { event: true },
      });

      if (!hold) {
        throw new Error('Seat hold not found');
      }

      if (hold.userId !== ctx.id) {
        throw new Error('This hold does not belong to you');
      }

      if (hold.expiresAt < new Date()) {
        throw new Error('Seat hold expired');
      }

      const existingBooking = await tx.booking.findFirst({
        where: {
          userId: ctx.id,
          eventId: hold.eventId,
          status: BookingStatus.CONFIRMED,
          createdAt: {
            gte: new Date(Date.now() - 1 * 60 * 1000),
          },
        },
      });

      if (existingBooking) {
        throw new Error('Booking already processed');
      }

      await tx.$queryRaw`
          SELECT * FROM "Event"
          WHERE id = ${hold.eventId}
          FOR UPDATE
        `;

      const total = hold.event.price * hold.quantity;

      const booking = await tx.booking.create({
        data: {
          userId: ctx.id,
          eventId: hold.eventId,
          quantity: hold.quantity,
          total,
          status: BookingStatus.PENDING,
        },
      });

      const settlement = await this.paymentsService.processBookingPayment(tx, {
        bookingId: booking.id,
        customerId: ctx.id,
        managerId: hold.event.managerId,
        total,
      });

      await tx.event.update({
        where: { id: hold.eventId },
        data: {
          bookedSeats: {
            increment: hold.quantity,
          },
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
        },
      });

      await tx.seatHold.delete({
        where: { id: holdId },
      });

      return {
        status: 'success',
        bookingId: booking.id,
        settlement,
      };
    });
  }
}
