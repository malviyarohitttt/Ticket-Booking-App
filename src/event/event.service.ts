/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuthenticatedUser } from '@Common';
import { Injectable } from '@nestjs/common';
import { CreateEventRequestDto } from './dto/create-event-request-dto';
import { PrismaService } from 'src/prisma';
import { UpdateEventRequestDto } from './dto/update-event-request-dto';
import { EventStatus } from 'src/generated/prisma/enums';

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  async allEvents() {
    const events = await this.prisma.event.findMany({
      orderBy: [{ createdAt: 'asc' }],
    });
    return events;
  }

  async event(id: number) {
    const event = await this.prisma.event.findUnique({
      where: {
        id,
      },
      include: {
        bookings: true,
      },
    });
    return event;
  }

  async createEvent(ctx: AuthenticatedUser, data: CreateEventRequestDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
          data: {
            title: data.title,
            description: data?.description,
            performer: data.performer,
            city: data.city,
            venue: data.venue,
            country: data.country,
            date: data.date,
            price: data.price,
            ageLimit: data.ageLimit,
            totalSeats: data.totalSeats,

            managerId: ctx.id,
          },
        });

        return {
          status: 'success',
          msg: 'Event created!',
          id: event.id,
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async updateEvent(
    ctx: AuthenticatedUser,
    id: number,
    data: UpdateEventRequestDto,
  ) {
    try {
      const event = await this.prisma.event.update({
        where: {
          id: id,
          managerId: ctx.id,
        },
        data: {
          title: data?.title,
          description: data?.description,
          performer: data?.performer,
          city: data?.city,
          venue: data?.venue,
          country: data?.country,
          date: data?.date,
          price: data?.price,
          ageLimit: data?.ageLimit,
          totalSeats: data?.totalSeats,
        },
      });

      return { status: 'success' };
    } catch (error) {
      throw error;
    }
  }

  async updateEventStatus(
    ctx: AuthenticatedUser,
    id: number,
    status: EventStatus,
  ) {
    try {
      await this.prisma.event.update({
        data: { status },
        where: {
          id,
          managerId: ctx.id,
        },
      });

      return { status: 'success' };
    } catch (error) {
      throw error;
    }
  }

  async bookings(eventId: number) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventId,
      },
      include: {
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true,
            mobile: true,
          },
        },
      },
    });

    if (!(bookings.length > 0)) {
      throw new Error('No bookings yet for this event!');
    }
    return { status: 'success', bookings };
  }
}

// const seatData = [];

// const rows = data.totalRows || 10;
// const seatsPerRow = data.seatsPerRows || 10;

// for (let i = 0; i < rows; i++) {
//   const row = String.fromCharCode(65 + i);

//   for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
//     seatData.push({
//       event_id: event.id,
//       row,
//       seatNumber,
//     });
//   }
// }

// await tx.seat.createMany({
//   data: seatData,
// });
