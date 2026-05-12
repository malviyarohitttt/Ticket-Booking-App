import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from 'src/prisma';

import {
  EventStatus,
  BookingStatus,
  SeatHoldStatus,
} from 'src/generated/prisma/enums';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async clearExpiredProcessingHolds() {
    const result = await this.prisma.seatHold.updateMany({
      where: {
        status: SeatHoldStatus.Processing,
        processingExpiresAt: {
          lt: new Date(),
        },
        booking: {
          status: BookingStatus.Pending,
        },
      },
      data: {
        status: SeatHoldStatus.Expired,
      },
    });

    if (result.count > 0) {
      this.logger.debug(`${result.count} processing holds expired`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async clearExpiredHolds() {
    const result = await this.prisma.seatHold.updateMany({
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

    if (result.count > 0) {
      this.logger.debug(`${result.count} holds expired`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCompletedEvents() {
    try {
      const result = await this.prisma.event.updateMany({
        where: {
          date: {
            lt: new Date(),
          },
          status: {
            not: EventStatus.Completed,
          },
        },
        data: {
          status: EventStatus.Completed,
        },
      });

      if (result.count > 0) {
        this.logger.debug(`${result.count} events marked completed`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);

      this.logger.error('Failed to complete events', message);
    }
  }
}
