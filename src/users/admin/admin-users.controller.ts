import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { UsersService } from '../users.service';
import { UserRole } from './schemas/user.schema';

@Controller('customers/admin')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  private async ensureAdmin(req: any) {
    const userId = req?.user?.userId || req?.user?.sub || req?.user?.id;
    if (!userId) {
      throw new ForbiddenException('Admin only');
    }

    const user = await this.usersService.findUserById(userId);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }
  }

  @UseGuards(AccessTokenGuard)
  @Get('customers')
  async listCustomersForAdmin(@Request() req: any) {
    await this.ensureAdmin(req);
    return this.usersService.listUsersByRole('user');
  }

  @UseGuards(AccessTokenGuard)
  @Get('riders')
  async listRidersForAdmin(@Request() req: any) {
    await this.ensureAdmin(req);
    return this.usersService.listUsersByRole('rider');
  }

  @UseGuards(AccessTokenGuard)
  @Get('admins')
  async listAdminsForAdmin(@Request() req: any) {
    await this.ensureAdmin(req);
    return this.usersService.listUsersByRole('admin');
  }

  @UseGuards(AccessTokenGuard)
  @Patch('users/:userId/role')
  async changeUserRole(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: { role: UserRole },
  ) {
    await this.ensureAdmin(req);
    if (!body?.role || !['user', 'rider', 'admin'].includes(body.role)) {
      throw new BadRequestException('Invalid role');
    }
    return this.usersService.adminChangeUserRole(userId, body.role);
  }

  @UseGuards(AccessTokenGuard)
  @Patch('users/:userId/ban')
  async setUserBan(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: { mode?: 'unban' | 'permanent' | 'days'; days?: number; isBanned?: boolean },
  ) {
    await this.ensureAdmin(req);
    const fallbackMode = body?.isBanned === true ? 'permanent' : 'unban';
    const mode = body?.mode ?? fallbackMode;
    return this.usersService.adminSetUserBan(userId, { mode, days: body?.days });
  }

  @UseGuards(AccessTokenGuard)
  @Patch('users/:userId/password')
  async changeUserPassword(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: { password: string },
  ) {
    await this.ensureAdmin(req);
    if (!body?.password) {
      throw new BadRequestException('Password is required');
    }
    return this.usersService.adminChangeUserPassword(userId, body.password);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('users/:userId')
  async deleteUser(@Request() req: any, @Param('userId') userId: string) {
    await this.ensureAdmin(req);
    const requesterId = req?.user?.userId || req?.user?.sub || req?.user?.id;
    if (requesterId === userId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    return this.usersService.adminDeleteUser(userId);
  }
}
