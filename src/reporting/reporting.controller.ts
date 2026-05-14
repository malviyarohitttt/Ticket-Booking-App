import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import { ReportingService } from './reporting.service';

@ApiBearerAuth()
@ApiTags('Reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('admin/dashboard')
  @Roles(UserType.Admin)
  getAdminDashboard() {
    return this.reportingService.getAdminDashboardReport();
  }

  @Get('admin/managers')
  @Roles(UserType.Admin)
  getAdminManagersReport() {
    return this.reportingService.getAdminManagerWiseReport();
  }

  @Get('admin/managers/:managerId')
  @Roles(UserType.Admin)
  getAdminManagerReport(
    @Param('managerId', ParseIntPipe)
    managerId: number,
  ) {
    return this.reportingService.getAdminManagerReport(managerId);
  }

  @Get('admin/events')
  @Roles(UserType.Admin)
  getAdminEventsReport() {
    return this.reportingService.getAdminEventWiseReport();
  }

  @Get('admin/events/:eventId')
  @Roles(UserType.Admin)
  getAdminEventReport(
    @Param('eventId', ParseIntPipe)
    eventId: number,
  ) {
    return this.reportingService.getAdminEventReport(eventId);
  }

  @Get('manager/dashboard')
  @Roles(UserType.Manager)
  getManagerDashboard(@Req() req: AuthenticatedRequest) {
    return this.reportingService.getManagerDashboardReport(req.user.id);
  }

  @Get('manager/events')
  @Roles(UserType.Manager)
  getManagerEventsReport(@Req() req: AuthenticatedRequest) {
    return this.reportingService.getManagerEventWiseReport(req.user.id);
  }

  @Get('manager/events/:eventId')
  @Roles(UserType.Manager)
  getManagerEventReport(
    @Param('eventId', ParseIntPipe)
    eventId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportingService.getManagerEventReport(req.user, eventId);
  }
}
