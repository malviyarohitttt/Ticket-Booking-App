import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';

import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('hold')
  async holdSeats(
    @Body()
    body: {
      userId: number;
      eventId: number;
      quantity: number;
    },
  ) {
    return this.bookingsService.holdSeats(
      body.userId,
      body.eventId,
      body.quantity,
    );
  }

  @Post('payment/:holdId')
  async processPayment(
    @Param('holdId', ParseIntPipe)
    holdId: number,
    @Body()
    body: {
      userId: number;
    },
  ) {
    return this.bookingsService.processPayment(body.userId, holdId);
  }

  @Post('confirm/:holdId')
  async confirmBooking(
    @Param('holdId', ParseIntPipe)
    holdId: number,
    @Body()
    body: {
      userId: number;
    },
  ) {
    return this.bookingsService.confirmBooking(body.userId, holdId);
  }
}
