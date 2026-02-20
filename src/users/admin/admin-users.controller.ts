import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UsersService } from '../users.service';
import { UserRole } from '../schemas/user.schema';

@Controller('customers/admin')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('customers')
  async listCustomersForAdmin() {
    return this.usersService.listUsersByRole('user');
  }

  @Get('riders')
  async listRidersForAdmin() {
    return this.usersService.listUsersByRole('rider');
  }

  @Get('admins')
  async listAdminsForAdmin() {
    return this.usersService.listUsersByRole('admin');
  }

  @Patch('users/:userId/role')
  async changeUserRole(
    @Param('userId') userId: string,
    @Body() body: { role: UserRole },
  ) {
    if (!body?.role || !['user', 'rider', 'admin'].includes(body.role)) {
      throw new BadRequestException('Invalid role');
    }
    return this.usersService.adminChangeUserRole(userId, body.role);
  }

  @Patch('users/:userId/ban')
  async setUserBan(
    @Param('userId') userId: string,
    @Body() body: { mode?: 'unban' | 'permanent' | 'days'; days?: number; isBanned?: boolean },
  ) {
    const fallbackMode = body?.isBanned === true ? 'permanent' : 'unban';
    const mode = body?.mode ?? fallbackMode;
    return this.usersService.adminSetUserBan(userId, { mode, days: body?.days });
  }

  @Patch('users/:userId/password')
  async changeUserPassword(
    @Param('userId') userId: string,
    @Body() body: { password: string },
  ) {
    if (!body?.password) {
      throw new BadRequestException('Password is required');
    }
    return this.usersService.adminChangeUserPassword(userId, body.password);
  }

  @Delete('users/:userId')
  async deleteUser(@Request() req: any, @Param('userId') userId: string) {
    const requesterId = req?.user?.userId || req?.user?.sub || req?.user?.id;
    if (requesterId === userId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    return this.usersService.adminDeleteUser(userId);
  }
}
