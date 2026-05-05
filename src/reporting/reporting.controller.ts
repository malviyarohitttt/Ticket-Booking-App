import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  getCtx(req: AuthenticatedRequest) {
    return req.user;
  }

  @Get('admin/dashboard')
  @Roles(UserType.Admin)
  getAdminDashboardData() {
    return this.reportingService.getAdminDashboardData();
  }

  @Get('manager/dashboard')
  @Roles(UserType.Manager)
  getManagerDashboardData(@Req() req: AuthenticatedRequest) {
    const ctx = this.getCtx(req);
    return this.reportingService.getManagerDashboardData(ctx.id);
  }

  @Get('manager/event-wise-report')
  @Roles(UserType.Manager)
  getManagerEventWiseReport(@Req() req: AuthenticatedRequest) {
    const ctx = this.getCtx(req);
    return this.reportingService.getManagerEventWiseReport(ctx.id);
  }

  @Get('user/purchase-history')
  @Roles(UserType.User, UserType.Manager)
  getUserPurchaseHistory(@Req() req: AuthenticatedRequest) {
    const ctx = this.getCtx(req);
    return this.reportingService.getUserPurchaseHistory(ctx.id);
  }
}
