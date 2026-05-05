import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Booking Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Roles(UserType.User)
  @Post('book/hold')
  holdTicket(
    @Req() req: AuthenticatedRequest,
    @Query() query: CreateBookingDto,
  ) {
    const ctx = req.user;
    return this.bookingsService.holdSeats(ctx, query);
  }

  @ApiParam({
    name: 'holdId',
  })
  @Roles(UserType.User)
  @Post('book/confirm/:holdId')
  bookTicket(
    @Req() req: AuthenticatedRequest,
    @Param('holdId', ParseIntPipe) holdId: number,
  ) {
    const ctx = req.user;
    return this.bookingsService.book(ctx, holdId);
  }
}
