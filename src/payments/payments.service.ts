import { Prisma, SplitType } from 'src/generated/prisma/client';
import { Injectable } from '@nestjs/common';
import { WalletService } from 'src/wallet/wallet.service';
@Injectable()
export class PaymentsService {
  constructor(private readonly walletService: WalletService) {}

  async processBookingPayment(
    tx: Prisma.TransactionClient,
    payload: {
      bookingId: number;
      userId: number;
      managerId: number;
      eventId: number;
      quantity: number;
      total: number;
    },
  ) {
    const { bookingId, eventId, quantity, userId, managerId, total } = payload;

    const event = await tx.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw new Error('Event not found');
    }

    const seatUpdate = await tx.event.updateMany({
      where: { id: eventId, bookedSeats: { lte: event.totalSeats - quantity } },
      data: { bookedSeats: { increment: quantity } },
    });

    if (seatUpdate.count === 0) {
      throw new Error('Not enough seats');
    }

    const { adminShare, managerShare } =
      await this.walletService.processBookingTransfer(tx, {
        bookingId,
        userId,
        managerId,
        total,
      });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'Confirmed' },
    });

    await tx.revenueSplit.createMany({
      data: [
        { bookingId, amount: adminShare, splitType: SplitType.Admin },
        { bookingId, amount: managerShare, splitType: SplitType.Manager },
      ],
    });

    return { total, adminShare, managerShare };
  }
}
