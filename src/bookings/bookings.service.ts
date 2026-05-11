import { Injectable, BadRequestException } from '@nestjs/common';

import { PrismaService } from 'src/prisma';

import { BookingStatus, Prisma } from 'src/generated/prisma/client';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async holdSeats(userId: number, eventId: number, quantity: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const eventRows = await tx.$queryRaw<any[]>`
          SELECT * FROM "Event"
          WHERE id = ${eventId}
          FOR UPDATE
        `;

        const event = eventRows[0];

        if (!event) {
          throw new BadRequestException('Event not found');
        }

        await tx.seatHold.updateMany({
          where: {
            status: 'Hold',
            expiresAt: {
              lt: new Date(),
            },
          },
          data: {
            status: 'Expired',
          },
        });

        const activeHolds = await tx.seatHold.aggregate({
          where: {
            eventId,
            status: {
              in: ['Hold', 'Processing'],
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

        const holdSeats = activeHolds._sum.quantity || 0;

        const availableSeats = event.totalSeats - event.bookedSeats - holdSeats;

        if (availableSeats < quantity) {
          throw new BadRequestException('Seats unavailable');
        }

        const hold = await tx.seatHold.create({
          data: {
            userId,
            eventId,
            quantity,
            status: 'Hold',
            expiresAt: new Date(Date.now() + 60 * 1000),
          },
        });

        return {
          holdId: hold.id,
          expiresAt: hold.expiresAt,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async processPayment(userId: number, holdId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const holdRows = await tx.$queryRaw<any[]>`
          SELECT * FROM "SeatHold"
          WHERE id = ${holdId}
          FOR UPDATE
        `;

        const hold = holdRows[0];

        if (!hold) {
          throw new BadRequestException('Hold not found');
        }

        if (hold.userId !== userId) {
          throw new BadRequestException('Unauthorized');
        }

        if (hold.status === 'Hold' && hold.expiresAt < new Date()) {
          await tx.seatHold.update({
            where: {
              id: hold.id,
            },
            data: {
              status: 'Expired',
            },
          });

          throw new BadRequestException('Hold expired');
        }

        if (hold.status === 'Processing') {
          throw new BadRequestException('Payment already processing');
        }

        const event = await tx.event.findUnique({
          where: {
            id: hold.eventId,
          },
        });

        if (!event) {
          throw new BadRequestException('Event not found');
        }

        const total = hold.quantity * event.price;

        const booking = await tx.booking.create({
          data: {
            userId,
            eventId: hold.eventId,
            quantity: hold.quantity,
            total,
            status: BookingStatus.Pending,
          },
        });

        await tx.seatHold.update({
          where: {
            id: hold.id,
          },
          data: {
            status: 'Processing',
            paymentStartedAt: new Date(),
            processingExpiresAt: new Date(Date.now() + 2 * 60 * 1000),
            bookingId: booking.id,
          },
        });

        return {
          bookingId: booking.id,
          total,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async confirmBooking(userId: number, holdId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const holdRows = await tx.$queryRaw<any[]>`
          SELECT * FROM "SeatHold"
          WHERE id = ${holdId}
          FOR UPDATE
        `;

        const hold = holdRows[0];

        if (!hold) {
          throw new BadRequestException('Hold not found');
        }

        if (hold.userId !== userId) {
          throw new BadRequestException('Unauthorized');
        }

        if (hold.status !== 'Processing') {
          throw new BadRequestException('Hold not in processing state');
        }

        if (hold.processingExpiresAt < new Date()) {
          await tx.seatHold.update({
            where: {
              id: hold.id,
            },
            data: {
              status: 'Expired',
            },
          });

          throw new BadRequestException('Processing expired');
        }

        const booking = await tx.booking.findUnique({
          where: {
            id: hold.bookingId,
          },
        });

        if (!booking) {
          throw new BadRequestException('Booking not found');
        }

        const event = await tx.event.findUnique({
          where: {
            id: booking.eventId,
          },
        });

        if (!event) {
          throw new BadRequestException('Event not found');
        }

        const seatUpdate = await tx.event.updateMany({
          where: {
            id: booking.eventId,
            bookedSeats: {
              lte: event.totalSeats - booking.quantity,
            },
          },
          data: {
            bookedSeats: {
              increment: booking.quantity,
            },
          },
        });

        if (seatUpdate.count === 0) {
          throw new BadRequestException('Not enough seats');
        }

        const wallet = await tx.wallet.updateMany({
          where: {
            userId,
            balance: {
              gte: booking.total,
            },
          },
          data: {
            balance: {
              decrement: booking.total,
            },
          },
        });

        if (wallet.count === 0) {
          throw new BadRequestException('Insufficient balance');
        }

        await tx.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: BookingStatus.Confirmed,
          },
        });

        await tx.seatHold.update({
          where: {
            id: hold.id,
          },
          data: {
            status: 'Completed',
          },
        });

        return {
          status: 'success',
          bookingId: booking.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
