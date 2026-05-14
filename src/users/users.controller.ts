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
  AccessGuard,
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';

import { UserRoles, UserStatus } from '../generated/prisma/client';

import {
  ChangePasswordRequestDto,
  GetUsersRequestDto,
  UpdateProfileDetailsRequestDto,
  UpdateProfileImageRequestDto,
  UpdateUserProfileRequestDto,
} from './dto';

import { UsersService } from './users.service';

@ApiTags('User Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('users')
export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @Get()
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  getUsers(@Query() query: GetUsersRequestDto) {
    return this.usersService.getAll({
      search: query.search,
      skip: query.skip,
      take: query.take,
    });
  }

  @Get('me')
  @Roles(UserType.User, UserType.Manager)
  @UseGuards(RolesGuard)
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('me')
  @Roles(UserType.User, UserType.Manager)
  @UseGuards(RolesGuard)
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body()
    data: UpdateProfileDetailsRequestDto,
  ) {
    if (data.mobile && (!data.dialCode || !data.country)) {
      throw new BadRequestException();
    }

    await this.usersService.updateProfileDetails({
      userId: req.user.id,
      username: data.username,
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      dialCode: data.dialCode,
      mobile: data.mobile,
      country: data.country,
    });

    return {
      status: 'success',
    };
  }

  @Post('me/profile-image')
  @Roles(UserType.User, UserType.Manager)
  @UseGuards(RolesGuard)
  updateProfileImage(
    @Req() req: AuthenticatedRequest,
    @Body()
    data: UpdateProfileImageRequestDto,
  ) {
    return this.usersService.updateProfileImage(req.user.id, data.profileImage);
  }

  @Post('me/change-password')
  @Roles(UserType.User, UserType.Manager)
  @UseGuards(RolesGuard)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body()
    data: ChangePasswordRequestDto,
  ) {
    await this.usersService.changePassword(
      req.user.id,
      data.oldPassword,
      data.newPassword,
    );

    return {
      status: 'success',
    };
  }

  @Get('me/bookings')
  @Roles(UserType.User)
  @UseGuards(RolesGuard)
  getMyBookings(@Req() req: AuthenticatedRequest) {
    return this.usersService.getMyBookings(req.user.id);
  }

  @Get('me/purchase-history')
  @Roles(UserType.User)
  @UseGuards(RolesGuard)
  getPurchaseHistory(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUserPurchaseHistory(req.user.id);
  }

  @Get('me/events')
  @Roles(UserType.Manager)
  @UseGuards(RolesGuard)
  getMyEvents(@Req() req: AuthenticatedRequest) {
    return this.usersService.myEvents(req.user);
  }

  @Get(':userId')
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @ApiParam({
    name: 'userId',
    type: Number,
  })
  getUserProfile(
    @Param('userId', ParseIntPipe)
    userId: number,
  ) {
    return this.usersService.getProfile(userId);
  }

  @Patch(':userId')
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @ApiParam({
    name: 'userId',
    type: Number,
  })
  updateUserProfile(
    @Param('userId', ParseIntPipe)
    userId: number,
    @Body()
    data: UpdateUserProfileRequestDto,
  ) {
    return this.usersService.updateProfileDetailsByAdministrator({
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

  @Post(':userId/status/:status')
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @ApiParam({
    name: 'userId',
    type: Number,
  })
  @ApiParam({
    name: 'status',
    enum: UserStatus,
  })
  async updateUserStatus(
    @Param('userId', ParseIntPipe)
    userId: number,
    @Param('status', new ParseEnumPipe(UserStatus))
    status: UserStatus,
  ) {
    await this.usersService.setStatus(userId, status);

    return {
      status: 'success',
    };
  }

  @Post(':userId/role/:role')
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @ApiParam({
    name: 'userId',
    type: Number,
  })
  @ApiParam({
    name: 'role',
    enum: UserRoles,
  })
  async updateUserRole(
    @Param('userId', ParseIntPipe)
    userId: number,
    @Param('role', new ParseEnumPipe(UserRoles))
    role: UserRoles,
  ) {
    await this.usersService.setRole(userId, role);

    return {
      status: 'success',
    };
  }
}
