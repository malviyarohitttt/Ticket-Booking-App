import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { PrismaModule } from 'src/prisma';
import { WalletService } from './wallet.service';

@Module({
  imports: [PrismaModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
