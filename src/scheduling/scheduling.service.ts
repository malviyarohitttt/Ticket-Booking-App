import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventStatus } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma';

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async clearExpiredSeatHolds() {
    const timeout = new Date(Date.now() - 10 * 60 * 1000);

    const result = await this.prisma.seatHold.updateMany({
      where: {
        status: 'Processing',
        paymentStartedAt: {
          lt: timeout,
        },
      },
      data: {
        status: 'Expired',
      },
    });

    if (result.count > 0) {
      console.log(`${result.count} seathold marked as Expired!`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async clearExpiredHolds() {
    const result = await this.prisma.seatHold.updateMany({
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
    if (result.count > 0) {
      console.log(`${result.count} seathold marked as Expired!`);
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
        console.log(`${result.count} events marked as COMPLETED`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      console.error('Failed to update completed events', message);
    }
  }
}
