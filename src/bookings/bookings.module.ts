import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { PrismaModule } from 'src/prisma';
import { PaymentsModule } from 'src/payments';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
