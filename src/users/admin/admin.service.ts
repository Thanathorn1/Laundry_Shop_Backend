import { Injectable } from '@nestjs/common';
import { UsersService } from '../users.service';
import { UserRole } from './schemas/user.schema';

@Injectable()
export class AdminService {
  constructor(private readonly usersService: UsersService) {}

  findUserById(userId: string) {
    return this.usersService.findUserById(userId);
  }

  listUsersByRole(role: UserRole) {
    return this.usersService.listUsersByRole(role);
  }

  adminChangeUserRole(userId: string, role: UserRole) {
    return this.usersService.adminChangeUserRole(userId, role);
  }

  adminCreateEmployee(email: string, password: string) {
    return this.usersService.adminCreateEmployee(email, password);
  }

  listEmployeesByShop() {
    return this.usersService.listEmployeesByShop();
  }

  listEmployeeJoinRequestsForAdmin() {
    return this.usersService.listEmployeeJoinRequestsForAdmin();
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

  adminAssignEmployeeToShop(employeeId: string, shopId?: string | null) {
    return this.usersService.adminAssignEmployeeToShop(employeeId, shopId);
  }

  adminSetUserBan(userId: string, payload: { mode: any; days?: number }) {
    return this.usersService.adminSetUserBan(userId, payload);
  }

  adminChangeUserPassword(userId: string, password: string) {
    return this.usersService.adminChangeUserPassword(userId, password);
  }

  adminDeleteUser(userId: string) {
    return this.usersService.adminDeleteUser(userId);
  }
}
