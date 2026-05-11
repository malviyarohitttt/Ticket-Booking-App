import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  RolesGuard,
  UserType,
  Roles,
  AccessGuard,
} from '@Common';
import { UsersService } from './users.service';
import {
  ChangePasswordRequestDto,
  GetUsersRequestDto,
  UpdateProfileDetailsRequestDto,
  UpdateProfileImageRequestDto,
  UpdateUserProfileRequestDto,
} from './dto';
import { UserRoles, UserStatus } from '../generated/prisma/client';

@ApiTags('User/Manager Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('users')
export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Get()
  async getUsers(@Query() query: GetUsersRequestDto) {
    return await this.usersService.getAll({
      search: query.search,
      skip: query.skip,
      take: query.take,
    });
  }

  @Roles(UserType.Manager)
  @UseGuards(RolesGuard)
  @Get('events')
  async getMyEvents(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return await this.usersService.myEvents(ctx.user);
  }
  @Get('purchase-history')
  @Roles(UserType.User)
  @UseGuards(RolesGuard)
  getUserPurchaseHistory(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return this.usersService.getUserPurchaseHistory(ctx.user.id);
  }

  @Get('my-bookings')
  @Roles(UserType.User)
  @UseGuards(RolesGuard)
  getMyBookings(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return this.usersService.getMyBookings(ctx.user.id);
  }

  @Get('me')
  @Roles(UserType.User, UserType.Manager)
  @UseGuards(RolesGuard)
  async getProfile(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return await this.usersService.getProfile(ctx.user.id);
  }

  @Patch('me')
  @Roles(UserType.User, UserType.Manager)
  @UseGuards(RolesGuard)
  async updateProfileDetails(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileDetailsRequestDto,
  ) {
    if (data.mobile && (!data.dialCode || !data.country)) {
      throw new BadRequestException();
    }
    const ctx = this.getContext(req);
    await this.usersService.updateProfileDetails({
      userId: ctx.user.id,
      username: data.username,
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      dialCode: data.dialCode,
      mobile: data.mobile,
      country: data.country,
    });
    return { status: 'success' };
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @ApiParam({
    name: 'userId',
    type: Number,
    description:
      'Unique identifier of the user whose profile needs to be fetched',
    example: 7,
  })
  @Get(':userId')
  async getUserProfile(@Param('userId', ParseIntPipe) userId: number) {
    return await this.usersService.getProfile(userId);
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @ApiParam({
    name: 'userId',
    type: Number,
    description:
      'Unique identifier of the user whose account details will be updated',
    example: 7,
  })
  @Patch(':userId')
  async updateUserProfileDetails(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() data: UpdateUserProfileRequestDto,
  ) {
    return await this.usersService.updateProfileDetailsByAdministrator({
      userId,
      username: data.username,
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      dialCode: data.dialCode,
      mobile: data.mobile,
      country: data.country,
      password: data.password,
    });
  }

  @Roles(UserType.User, UserType.Manager)
  @UseGuards(RolesGuard)
  @Post('me/profile-image')
  updateProfileImage(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileImageRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.usersService.updateProfileImage(ctx.user.id, data.profileImage);
  }

  @Roles(UserType.User, UserType.Manager)
  @UseGuards(RolesGuard)
  @Post('me/change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() data: ChangePasswordRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.usersService.changePassword(
      ctx.user.id,
      data.oldPassword,
      data.newPassword,
    );
    return { status: 'success' };
  }

  @ApiParam({
    name: 'status',
    enum: UserStatus,
    example: UserStatus.Active,
  })
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Post('status/:userId/:status')
  async setUserStatus(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('status', new ParseEnumPipe(UserStatus)) status: UserStatus,
  ) {
    await this.usersService.setStatus(userId, status);
    return { status: 'success' };
  }

  @ApiParam({
    name: 'userId',
    example: 1,
  })
  @ApiParam({
    name: 'role',
    enum: UserRoles,
  })
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Post('role/:userId/:role')
  async setUserRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('role', new ParseEnumPipe(UserRoles)) role: UserRoles,
  ) {
    await this.usersService.setRole(userId, role);

    return { status: 'success' };
  }
}
