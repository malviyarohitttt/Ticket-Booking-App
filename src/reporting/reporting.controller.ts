import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
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
    return this.reportingService.getAdminDashboard();
  }

  @Roles(UserType.Admin)
  @Get('admin/manager-wise-report')
  @Roles(UserType.Admin)
  getAdminMangerWiseData() {
    return this.reportingService.getManagerWiseReport();
  }

  @Roles(UserType.Admin)
  @Get('admin/manager-report/:managerId')
  @Roles(UserType.Admin)
  getAdminMangerData(@Param('managerId', ParseIntPipe) managerId: number) {
    return this.reportingService.getAdminMangerData(managerId);
  }

  @Get('manager/dashboard')
  @Roles(UserType.Manager)
  getManagerDashboardData(@Req() req: AuthenticatedRequest) {
    const ctx = this.getCtx(req);
    return this.reportingService.getManagerDashboard(ctx.id);
  }

  @Get('manager/event-wise-report')
  @Roles(UserType.Manager)
  getManagerEventWiseReport(@Req() req: AuthenticatedRequest) {
    const ctx = this.getCtx(req);
    return this.reportingService.getManagerEventWiseReport(ctx.id);
  }
}
