import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import { EventStatus } from 'src/generated/prisma/enums';
import { CreateEventRequestDto, UpdateEventRequestDto } from './dto';
import { EventService } from './event.service';

@ApiTags('Event Management')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  getContext(req: AuthenticatedRequest) {
    return req.user;
  }

  @Get()
  events() {
    return this.eventService.allEvents();
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.Manager)
  @Post('create')
  create(
    @Req() req: AuthenticatedRequest,
    @Body() data: CreateEventRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.eventService.createEvent(ctx, data);
  }

  @ApiParam({
    name: 'eventId',
    type: Number,
  })
  @Roles(UserType.Admin, UserType.Manager)
  @Get('bookings/:eventId')
  eventsBookings(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.eventService.bookings(eventId);
  }

  @ApiParam({
    name: 'id',
    type: Number,
  })
  @Get(':id')
  event(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.event(id);
  }

  @ApiParam({
    name: 'eventId',
    type: Number,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.Manager)
  @Patch(':eventId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() data: UpdateEventRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.eventService.updateEvent(ctx, eventId, data);
  }

  @ApiParam({
    name: 'id',
    type: Number,
  })
  @ApiParam({
    name: 'status',
    enum: EventStatus,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.Manager)
  @Patch('status/:id/:status')
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('status', new ParseEnumPipe(EventStatus)) status: EventStatus,
  ) {
    const ctx = this.getContext(req);
    await this.eventService.updateEventStatus(ctx, id, status);
    return { status: 'success' };
  }
}
