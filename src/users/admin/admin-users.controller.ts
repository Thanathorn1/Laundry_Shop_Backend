import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import {
  AssignEmployeeShopDto,
  ChangeUserPasswordDto,
  ChangeUserRoleDto,
  CreateEmployeeDto,
  ResolveEmployeeJoinRequestDto,
  SetUserBanDto,
} from './dto/admin-users.dto';
import { AdminService } from './admin.service';

@Controller('customers/admin')
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  private async ensureAdmin(req: any) {
    const userId = req?.user?.userId || req?.user?.sub || req?.user?.id;
    if (!userId) {
      throw new ForbiddenException('Admin only');
    }

    const user = await this.adminService.findUserById(userId);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }
  }

  @UseGuards(AccessTokenGuard)
  @Get('customers')
  async listCustomersForAdmin(@Request() req: any) {
    await this.ensureAdmin(req);
    return this.adminService.listUsersByRole('user');
  }

  @UseGuards(AccessTokenGuard)
  @Get('riders')
  async listRidersForAdmin(@Request() req: any) {
    await this.ensureAdmin(req);
    return this.adminService.listUsersByRole('rider');
  }

  @UseGuards(AccessTokenGuard)
  @Get('admins')
  async listAdminsForAdmin(@Request() req: any) {
    await this.ensureAdmin(req);
    return this.adminService.listUsersByRole('admin');
  }

  @UseGuards(AccessTokenGuard)
  @Patch('users/:userId/role')
  async changeUserRole(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: ChangeUserRoleDto,
  ) {
    await this.ensureAdmin(req);
    return this.adminService.adminChangeUserRole(userId, body.role);
  }

  @UseGuards(AccessTokenGuard)
  @Get('employees')
  async listEmployeesForAdmin(@Request() req: any) {
    await this.ensureAdmin(req);
    return this.adminService.listUsersByRole('employee');
  }

  @UseGuards(AccessTokenGuard)
  @Post('employees')
  async createEmployeeForAdmin(
    @Request() req: any,
    @Body() body: CreateEmployeeDto,
  ) {
    await this.ensureAdmin(req);
    return this.adminService.adminCreateEmployee(body.email, body.password);
  }

  @UseGuards(AccessTokenGuard)
  @Get('employees/by-shop')
  async listEmployeesByShop(@Request() req: any) {
    await this.ensureAdmin(req);
    return this.adminService.listEmployeesByShop();
  }

  @UseGuards(AccessTokenGuard)
  @Get('employees/join-requests')
  async listEmployeeJoinRequests(@Request() req: any) {
    await this.ensureAdmin(req);
    return this.adminService.listEmployeeJoinRequestsForAdmin();
  }

  @UseGuards(AccessTokenGuard)
  @Patch('employees/:employeeId/join-request')
  async resolveEmployeeJoinRequest(
    @Request() req: any,
    @Param('employeeId') employeeId: string,
    @Body() body: ResolveEmployeeJoinRequestDto,
  ) {
    await this.ensureAdmin(req);
    const requesterId = req?.user?.userId || req?.user?.sub || req?.user?.id;
    const action = body?.action;
    return this.adminService.resolveEmployeeJoinRequest(
      requesterId,
      employeeId,
      action,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Patch('employees/:employeeId/shop')
  async assignEmployeeShop(
    @Request() req: any,
    @Param('employeeId') employeeId: string,
    @Body() body: AssignEmployeeShopDto,
  ) {
    await this.ensureAdmin(req);
    return this.adminService.adminAssignEmployeeToShop(
      employeeId,
      body?.shopId ?? null,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Patch('users/:userId/ban')
  async setUserBan(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: SetUserBanDto,
  ) {
    await this.ensureAdmin(req);
    const fallbackMode = body?.isBanned === true ? 'permanent' : 'unban';
    const mode = body?.mode ?? fallbackMode;
    return this.adminService.adminSetUserBan(userId, {
      mode,
      days: body?.days,
    });
  }

  @UseGuards(AccessTokenGuard)
  @Patch('users/:userId/password')
  async changeUserPassword(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: ChangeUserPasswordDto,
  ) {
    await this.ensureAdmin(req);
    return this.adminService.adminChangeUserPassword(userId, body.password);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('users/:userId')
  async deleteUser(@Request() req: any, @Param('userId') userId: string) {
    await this.ensureAdmin(req);
    const requesterId = req?.user?.userId || req?.user?.sub || req?.user?.id;
    if (requesterId === userId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    return this.adminService.adminDeleteUser(userId);
  }
}
