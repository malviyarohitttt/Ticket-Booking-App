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

  @Get()
  getEvents() {
    return this.eventService.allEvents();
  }

  @Get(':eventId')
  @ApiParam({
    name: 'eventId',
    type: Number,
  })
  getEvent(
    @Param('eventId', ParseIntPipe)
    eventId: number,
  ) {
    return this.eventService.event(eventId);
  }

  @Get(':eventId/bookings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.Admin, UserType.Manager)
  @ApiParam({
    name: 'eventId',
    type: Number,
  })
  getEventBookings(
    @Param('eventId', ParseIntPipe)
    eventId: number,
  ) {
    return this.eventService.bookings(eventId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.Manager)
  createEvent(
    @Req() req: AuthenticatedRequest,
    @Body() data: CreateEventRequestDto,
  ) {
    return this.eventService.createEvent(req.user, data);
  }

  @Patch(':eventId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.Manager)
  @ApiParam({
    name: 'eventId',
    type: Number,
  })
  updateEvent(
    @Req() req: AuthenticatedRequest,
    @Param('eventId', ParseIntPipe)
    eventId: number,
    @Body() data: UpdateEventRequestDto,
  ) {
    return this.eventService.updateEvent(req.user, eventId, data);
  }

  @Patch(':eventId/status/:status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.Manager)
  @ApiParam({
    name: 'eventId',
    type: Number,
  })
  @ApiParam({
    name: 'status',
    enum: EventStatus,
  })
  async updateEventStatus(
    @Req() req: AuthenticatedRequest,
    @Param('eventId', ParseIntPipe)
    eventId: number,
    @Param('status', new ParseEnumPipe(EventStatus))
    status: EventStatus,
  ) {
    await this.eventService.updateEventStatus(req.user, eventId, status);

    return {
      status: 'success',
    };
  }
}
