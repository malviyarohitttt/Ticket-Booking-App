import { Injectable } from '@nestjs/common';
import { AuthenticatedUser, UserType } from '@Common';
import { PrismaService } from 'src/prisma';
import { TxnPurpose, TxnType } from 'src/generated/prisma/enums';
import { Prisma } from 'src/generated/prisma/client';
import { AddAmountRequestDto } from './dto';

@Injectable()
export class WalletService {
  private readonly ADMIN_ID = 1;
  private readonly ADMIN_PERCENT = 18.8;
  private readonly MANAGER_PERCENT = 81.2;

  constructor(private readonly prisma: PrismaService) {}

  async deposit(ctx: AuthenticatedUser, data: AddAmountRequestDto) {
    if (ctx.type === UserType.User || ctx.type === UserType.Manager) {
      return await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { userId: ctx.id },
        });

        if (!wallet) {
          throw new Error('Wallet not found');
        }

        const updatedWallet = await tx.wallet.update({
          where: { userId: ctx.id },
          data: {
            balance: {
              increment: data.amount,
            },
          },
        });

        await tx.transaction.create({
          data: {
            userId: ctx.id,
            walletId: wallet.id,
            amount: data.amount,
            type: TxnType.Credit,
            purpose: TxnPurpose.WalletTopup,
            note: 'Wallet deposited successfully',
          },
        });

        return {
          status: 'success',
          depositedAmount: data.amount,
          newBalance: updatedWallet.balance,
        };
      });
    }

    if (ctx.type === UserType.Admin) {
      return await this.prisma.$transaction(async (tx) => {
        const adminWallet = await tx.adminWallet.findUnique({
          where: { adminId: ctx.id },
        });

        if (!adminWallet) {
          throw new Error('Admin wallet not found');
        }

        const updatedAdminWallet = await tx.adminWallet.update({
          where: { adminId: ctx.id },
          data: {
            balance: {
              increment: data.amount,
            },
          },
        });

        await tx.adminTransactions.create({
          data: {
            adminId: ctx.id,
            adminWalletId: adminWallet.id,
            amount: data.amount,
            type: TxnType.Credit,
            purpose: TxnPurpose.WalletTopup,
            note: 'Admin wallet deposited successfully',
          },
        });

        return {
          status: 'success',
          depositedAmount: data.amount,
          newBalance: updatedAdminWallet.balance,
        };
      });
    }

    throw new Error('Unauthorized access');
  }

  async balance(ctx: AuthenticatedUser) {
    if (ctx.type === UserType.User || ctx.type === UserType.Manager) {
      const wallet = await this.prisma.wallet.findUnique({
        where: {
          userId: ctx.id,
        },
        select: {
          balance: true,
        },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      return {
        status: 'success',
        balance: wallet.balance,
      };
    }

    if (ctx.type === UserType.Admin) {
      const adminWallet = await this.prisma.adminWallet.findUnique({
        where: {
          adminId: ctx.id,
        },
        select: {
          balance: true,
        },
      });

      if (!adminWallet) {
        throw new Error('Admin wallet not found');
      }

      return {
        status: 'success',
        balance: adminWallet.balance,
      };
    }

    throw new Error('Unauthorized access');
  }

  async transactions(ctx: AuthenticatedUser) {
    if (ctx.type === UserType.Manager || ctx.type === UserType.User) {
      const transaction = await this.prisma.transaction.findMany({
        where: {
          userId: ctx.id,
        },
        omit: {
          referenceId: true,
          walletId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'success',
        transaction,
      };
    }

    if (ctx.type === UserType.Admin) {
      const transaction = await this.prisma.adminTransactions.findMany({
        where: {
          adminId: ctx.id,
        },
        omit: {
          referenceId: true,
          adminWalletId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'success',
        transaction,
      };
    }

    throw new Error('Unauthorized access');
  }

  async processBookingTransfer(
    tx: Prisma.TransactionClient,
    payload: {
      bookingId: number;
      userId: number;
      managerId: number;
      total: number;
    },
  ) {
    const { bookingId, userId, managerId, total } = payload;

    const customerWallet = await tx.wallet.findUnique({
      where: { userId: userId },
    });

    if (!customerWallet) {
      throw new Error('Customer wallet not found');
    }

    const managerWallet = await tx.wallet.findUnique({
      where: { userId: managerId },
    });

    if (!managerWallet) {
      throw new Error('Manager wallet not found');
    }

    const adminWallet = await tx.adminWallet.findUnique({
      where: { adminId: this.ADMIN_ID },
    });

    if (!adminWallet) {
      throw new Error('Admin wallet not configured');
    }

    const deduction = await tx.wallet.updateMany({
      where: {
        userId: userId,
        balance: {
          gte: total,
        },
      },
      data: {
        balance: {
          decrement: total,
        },
      },
    });

    if (deduction.count === 0) {
      throw new Error('Insufficient balance');
    }

    const adminShare = Number(((total * this.ADMIN_PERCENT) / 100).toFixed(2));

    const managerShare = Number(
      ((total * this.MANAGER_PERCENT) / 100).toFixed(2),
    );

    await tx.adminWallet.update({
      where: {
        adminId: this.ADMIN_ID,
      },
      data: {
        balance: {
          increment: adminShare,
        },
      },
    });

    await tx.wallet.update({
      where: {
        userId: managerId,
      },
      data: {
        balance: {
          increment: managerShare,
        },
      },
    });

    await tx.transaction.create({
      data: {
        userId: userId,
        walletId: customerWallet.id,
        amount: total,
        type: TxnType.Debit,
        purpose: TxnPurpose.BookingPayment,
        referenceId: bookingId,
        note: 'Ticket booking payment',
      },
    });

    await tx.adminTransactions.create({
      data: {
        adminId: this.ADMIN_ID,
        adminWalletId: adminWallet.id,
        amount: adminShare,
        type: TxnType.Credit,
        purpose: TxnPurpose.PlatformCommission,
        referenceId: bookingId,
        note: 'Platform commission earned',
      },
    });

    await tx.transaction.create({
      data: {
        userId: managerId,
        walletId: managerWallet.id,
        amount: managerShare,
        type: TxnType.Credit,
        purpose: TxnPurpose.EventManagerPayout,
        referenceId: bookingId,
        note: 'Event manager payout',
      },
    });

    return {
      adminShare,
      managerShare,
    };
  }
}
