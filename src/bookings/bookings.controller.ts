import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import { CreateBookingDto } from './dto';
import { BookingsService } from './bookings.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.User)
@ApiTags('Booking Management')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('hold')
  async holdSeats(
    @Query()
    query: CreateBookingDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const ctx = req.user;

    return this.bookingsService.holdSeats(
      ctx.id,
      query.eventId,
      query.ticketQuantity,
    );
  }

  @Post('book/:holdId')
  async processPayment(
    @Param('holdId', ParseIntPipe)
    holdId: number,
    @Req()
    req: AuthenticatedRequest,
  ) {
    const ctx = req.user;
    return this.bookingsService.processPayment(ctx.id, holdId);
  }
}
