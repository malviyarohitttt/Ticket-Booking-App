import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedRequest, JwtAuthGuard } from '@Common';

import { WalletService } from './wallet.service';

import { AddAmountRequestDto } from './dto';

@ApiTags('Wallet & Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  getBalance(@Req() req: AuthenticatedRequest) {
    return this.walletService.balance(req.user);
  }

  @Get('transactions')
  getTransactions(@Req() req: AuthenticatedRequest) {
    return this.walletService.transactions(req.user);
  }

  @Post('deposit')
  deposit(@Req() req: AuthenticatedRequest, @Body() data: AddAmountRequestDto) {
    return this.walletService.deposit(req.user, data);
  }
}
