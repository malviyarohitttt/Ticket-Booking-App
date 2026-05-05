// import { ForbiddenException, Injectable } from '@nestjs/common';
// import { AuthenticatedUser, UserType } from '@Common';
// import { PrismaService } from 'src/prisma';
// import { AddAmountRequestDto } from './dto/add-amount-request-dto';
// import { TxnPurpose, TxnType } from 'src/generated/prisma/enums';

// @Injectable()
// export class WalletService {
//   constructor(private readonly prisma: PrismaService) {}

//   async deposit(ctx: AuthenticatedUser, data: AddAmountRequestDto) {
//     return await this.prisma.$transaction(async (tx) => {
//       const wallet = await tx.wallet.findUnique({
//         where: { userId: ctx.id },
//       });

//       if (!wallet) {
//         throw new Error('Wallet not found');
//       }

//       await tx.wallet.update({
//         where: { userId: ctx.id },
//         data: {
//           balance: {
//             increment: data.amount,
//           },
//         },
//       });

//       await tx.transaction.create({
//         data: {
//           userId: ctx.id,
//           walletId: wallet.id,
//           amount: data.amount,
//           type: TxnType.CREDIT,
//           purpose: TxnPurpose.WALLET_TOPUP,
//           note: 'Wallet deposited successfully',
//         },
//       });

//       return {
//         status: 'success',
//         depositedAmount: data.amount,
//         newBalance: wallet.balance + data.amount,
//       };
//     });
//   }

//   async balance(ctx: AuthenticatedUser) {
//     try {
//       const wallet = await this.prisma.wallet.findFirst({
//         where: {
//           id: ctx.id,
//         },
//         select: {
//           balance: true,
//         },
//       });
//       return { status: 'success', wallet };
//     } catch (error) {
//       throw error;
//     }
//   }

//   async transactions(ctx: AuthenticatedUser) {
//     if (ctx.type === UserType.Manager || ctx.type === UserType.User) {
//       const transaction = await this.prisma.transaction.findMany({
//         where: {
//           userId: ctx.id,
//         },
//         omit: {
//           referenceId: true,
//           walletId: true,
//         },
//         orderBy: {
//           createdAt: 'desc',
//         },
//       });

//       return {
//         status: 'success',
//         transaction,
//       };
//     }

//     if (ctx.type === UserType.Admin) {
//       const transaction = await this.prisma.adminTransactions.findMany({
//         where: {
//           adminId: ctx.id,
//         },
//         omit: {
//           referenceId: true,
//           adminWalletId: true,
//         },
//         orderBy: {
//           createdAt: 'desc',
//         },
//       });

//       return {
//         status: 'success',
//         transaction,
//       };
//     }

//     throw new ForbiddenException('Unauthorized access');
//   }
// }

import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser, UserType } from '@Common';
import { PrismaService } from 'src/prisma';
import { AddAmountRequestDto } from './dto/add-amount-request-dto';
import { TxnPurpose, TxnType } from 'src/generated/prisma/enums';

@Injectable()
export class WalletService {
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
            type: TxnType.CREDIT,
            purpose: TxnPurpose.WALLET_TOPUP,
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
            type: TxnType.CREDIT,
            purpose: TxnPurpose.WALLET_TOPUP,
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

    throw new ForbiddenException('Unauthorized access');
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

    throw new ForbiddenException('Unauthorized access');
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

    throw new ForbiddenException('Unauthorized access');
  }
}
