import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { EmployeeService } from './employee.service';

@UseGuards(AccessTokenGuard)
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  private async ensureRole(
    req: any,
    allowedRoles: Array<'user' | 'rider' | 'admin' | 'employee'>,
  ) {
    const userId = req?.user?.userId || req?.user?.sub || req?.user?.id;
    if (!userId) {
      throw new ForbiddenException('Unauthorized');
    }

    const user = await this.employeeService.findUserById(userId);
    if (!user || !allowedRoles.includes(user.role as any)) {
      throw new ForbiddenException('Employee only');
    }

    return String(user._id);
  }

  @Get('me')
  async getMyProfile(@Req() req: any) {
    const employeeId = await this.ensureRole(req, ['employee', 'admin']);
    return this.employeeService.getEmployeeProfile(employeeId);
  }

  @Put('update')
  async updateProfile(
    @Req() req: any,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      profileImage?: string;
    },
  ) {
    const employeeId = await this.ensureRole(req, ['employee', 'admin']);
    return this.employeeService.updateEmployeeProfile(employeeId, body);
  }

  @Get('shops/nearby')
  async nearbyShops(
    @Req() req: any,
    @Query('lat') latRaw: string,
    @Query('lng') lngRaw: string,
    @Query('maxDistanceKm') maxRaw?: string,
  ) {
    const employeeId = await this.ensureRole(req, ['employee', 'admin']);

    const hasLat = latRaw !== undefined && latRaw !== null && latRaw !== '';
    const hasLng = lngRaw !== undefined && lngRaw !== null && lngRaw !== '';
    const lat = hasLat ? Number(latRaw) : undefined;
    const lng = hasLng ? Number(lngRaw) : undefined;
    const maxDistanceKm = maxRaw ? Number(maxRaw) : 8;

    if ((hasLat && Number.isNaN(lat)) || (hasLng && Number.isNaN(lng))) {
      throw new BadRequestException('lat and lng must be numbers');
    }

    return this.employeeService.listNearbyShopsForEmployee(
      employeeId,
      lat,
      lng,
      Number.isNaN(maxDistanceKm) ? 8 : maxDistanceKm,
    );
  }

  @Get('shops/:shopId/orders')
  async getShopOrders(@Req() req: any, @Param('shopId') shopId: string) {
    await this.ensureRole(req, ['employee', 'admin']);
    return this.employeeService.listEmployeeShopOrders(shopId);
  }

  @Post('shops/:shopId/join-request')
  async requestJoinShop(@Req() req: any, @Param('shopId') shopId: string) {
    const employeeId = await this.ensureRole(req, ['employee', 'admin']);
    return this.employeeService.employeeRequestJoinShop(employeeId, shopId);
  }

  @Get('shops/:shopId/join-requests')
  async listShopJoinRequests(@Req() req: any, @Param('shopId') shopId: string) {
    const employeeId = await this.ensureRole(req, ['employee', 'admin']);
    const actor = await this.employeeService.findUserById(employeeId);
    if (!actor) {
      throw new ForbiddenException('Employee only');
    }

    const assignedShopIds = Array.isArray((actor as any).assignedShopIds)
      ? (actor as any).assignedShopIds.map(String)
      : [];
    const canView =
      actor.role === 'admin' ||
      (actor.role === 'employee' &&
        ((actor as any).assignedShopId === shopId ||
          assignedShopIds.includes(String(shopId))));
    if (!canView) {
      throw new ForbiddenException(
        'Not allowed to view join requests for this shop',
      );
    }

    return this.employeeService.listEmployeeJoinRequestsForShop(shopId);
  }

  @Patch('join-requests/:employeeId')
  async resolveJoinRequest(
    @Req() req: any,
    @Param('employeeId') employeeId: string,
    @Body() body: { action?: 'approve' | 'reject' },
  ) {
    const actorUserId = await this.ensureRole(req, ['employee', 'admin']);
    const action = body?.action;
    if (action !== 'approve' && action !== 'reject') {
      throw new BadRequestException('action must be approve or reject');
    }

    return this.employeeService.resolveEmployeeJoinRequest(
      actorUserId,
      employeeId,
      action,
    );
  }

  @Patch('orders/:orderId/start-wash')
  async startWash(@Req() req: any, @Param('orderId') orderId: string) {
    const employeeId = await this.ensureRole(req, ['employee', 'admin']);
    return this.employeeService.employeeStartWash(orderId, employeeId);
  }

  @Patch('orders/:orderId/finish-wash')
  async finishWash(@Req() req: any, @Param('orderId') orderId: string) {
    const employeeId = await this.ensureRole(req, ['employee', 'admin']);
    return this.employeeService.employeeFinishWash(orderId, employeeId);
  }

  @Patch('orders/:orderId/finish-dry')
  async finishDry(@Req() req: any, @Param('orderId') orderId: string) {
    const employeeId = await this.ensureRole(req, ['employee', 'admin']);
    return this.employeeService.employeeFinishDry(orderId, employeeId);
  }
}
