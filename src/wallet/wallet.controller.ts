import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AuthenticatedRequest, JwtAuthGuard } from '@Common';
import { AddAmountRequestDto } from './dto/add-amount-request-dto';

@ApiTags('Wallet & Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('deposit')
  depositAmount(
    @Req() req: AuthenticatedRequest,
    @Body() data: AddAmountRequestDto,
  ) {
    const ctx = req.user;
    return this.walletService.deposit(ctx, data);
  }

  @Get('balance')
  balance(@Req() req: AuthenticatedRequest) {
    const ctx = req.user;
    return this.walletService.balance(ctx);
  }

  @Get('transactions')
  transactions(@Req() req: AuthenticatedRequest) {
    const ctx = req.user;
    return this.walletService.transactions(ctx);
  }
}
