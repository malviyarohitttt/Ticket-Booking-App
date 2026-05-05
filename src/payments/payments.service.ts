import { PrismaService } from 'src/prisma';
import {
  Prisma,
  TxnPurpose,
  TxnType,
  SplitType,
} from 'src/generated/prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  ADMIN_PERCENT = 18.8;
  MANAGER_PERCENT = 81.2;

  constructor(private readonly prisma: PrismaService) {}

  async processBookingPayment(
    tx: Prisma.TransactionClient,
    payload: {
      bookingId: number;
      customerId: number;
      managerId: number;
      total: number;
    },
  ) {
    const { bookingId, customerId, managerId, total } = payload;

    const customerWallet = await tx.wallet.findUnique({
      where: { userId: customerId },
    });

    if (!customerWallet || customerWallet.balance < total) {
      throw new Error('Insufficient wallet balance');
    }

    const adminWallet = await tx.adminWallet.findUnique({
      where: { adminId: 1 },
    });

    if (!adminWallet) {
      throw new Error('Admin wallet not configured');
    }

    const managerWallet = await tx.wallet.findUnique({
      where: { userId: managerId },
    });

    if (!managerWallet) {
      throw new Error('Manager wallet not configured');
    }

    const adminShare = Number(((total * this.ADMIN_PERCENT) / 100).toFixed(2));
    const managerShare = Number(
      ((total * this.MANAGER_PERCENT) / 100).toFixed(2),
    );

    await tx.wallet.update({
      where: { userId: customerId },
      data: {
        balance: { decrement: total },
      },
    });

    await tx.adminWallet.update({
      where: { adminId: 1 },
      data: {
        balance: { increment: adminShare },
      },
    });

    await tx.wallet.update({
      where: { userId: managerId },
      data: {
        balance: { increment: managerShare },
      },
    });

    await tx.transaction.create({
      data: {
        userId: customerId,
        walletId: customerWallet.id,
        amount: total,
        type: TxnType.DEBIT,
        purpose: TxnPurpose.BOOKING_PAYMENT,
        referenceId: bookingId,
        note: 'Ticket booking payment',
      },
    });

    await tx.adminTransactions.create({
      data: {
        adminId: 1,
        adminWalletId: adminWallet.id,
        amount: adminShare,
        type: TxnType.CREDIT,
        purpose: TxnPurpose.PLATFORM_COMMISSION,
        referenceId: bookingId,
        note: 'Platform commission earned',
      },
    });

    await tx.transaction.create({
      data: {
        userId: managerId,
        walletId: managerWallet.id,
        amount: managerShare,
        type: TxnType.CREDIT,
        purpose: TxnPurpose.EVENT_MANAGER_PAYOUT,
        referenceId: bookingId,
        note: 'Event manager payout',
      },
    });

    await tx.revenueSplit.createMany({
      data: [
        {
          bookingId,
          amount: adminShare,
          splitType: SplitType.ADMIN,
        },
        {
          bookingId,
          amount: managerShare,
          splitType: SplitType.MANAGER,
        },
      ],
    });

    return {
      total,
      adminShare,
      managerShare,
    };
  }
}
