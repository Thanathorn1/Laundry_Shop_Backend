import { Injectable } from '@nestjs/common';
import { UsersService } from '../users.service';

@Injectable()
export class EmployeeService {
  constructor(private readonly usersService: UsersService) {}

  findUserById(userId: string) {
    return this.usersService.findUserById(userId);
  }

  getEmployeeProfile(userId: string) {
    return this.usersService.getEmployeeProfile(userId);
  }

  updateEmployeeProfile(userId: string, body: any) {
    return this.usersService.updateEmployeeProfile(userId, body);
  }

  listNearbyShopsForEmployee(
    userId: string,
    lat?: number,
    lng?: number,
    maxDistanceKm?: number,
  ) {
    return this.usersService.listNearbyShopsForEmployee(
      userId,
      lat,
      lng,
      maxDistanceKm,
    );
  }

  listEmployeeShopOrders(shopId: string) {
    return this.usersService.listEmployeeShopOrders(shopId);
  }

  employeeRequestJoinShop(userId: string, shopId: string) {
    return this.usersService.employeeRequestJoinShop(userId, shopId);
  }

  listEmployeeJoinRequestsForShop(shopId: string) {
    return this.usersService.listEmployeeJoinRequestsForShop(shopId);
  }

  resolveEmployeeJoinRequest(
    actorUserId: string,
    employeeId: string,
    action: 'approve' | 'reject',
  ) {
    return this.usersService.resolveEmployeeJoinRequest(
      actorUserId,
      employeeId,
      action,
    );
  }

  employeeStartWash(orderId: string, userId: string) {
    return this.usersService.employeeStartWash(orderId, userId);
  }

  employeeFinishWash(orderId: string, userId: string) {
    return this.usersService.employeeFinishWash(orderId, userId);
  }

  employeeFinishDry(orderId: string, userId: string) {
    return this.usersService.employeeFinishDry(orderId, userId);
  }

  getShopInfo(shopId: string) {
    return this.usersService.getShopWithMachineAvailability(shopId);
  }
}
