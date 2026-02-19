import { Controller, ForbiddenException, Get, Request, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { UsersService } from '../users.service';

@Controller('customers/admin')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  private ensureAdmin(req: any) {
    if (req?.user?.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }
  }

  @UseGuards(AccessTokenGuard)
  @Get('customers')
  async listCustomersForAdmin(@Request() req: any) {
    this.ensureAdmin(req);
    return this.usersService.listUsersByRole('user');
  }

  @UseGuards(AccessTokenGuard)
  @Get('riders')
  async listRidersForAdmin(@Request() req: any) {
    this.ensureAdmin(req);
    return this.usersService.listUsersByRole('rider');
  }
}
