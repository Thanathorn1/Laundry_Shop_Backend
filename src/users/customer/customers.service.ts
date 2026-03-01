import { Injectable } from '@nestjs/common';
import { UsersService } from '../users.service';

@Injectable()
export class CustomersService {
  constructor(private readonly usersService: UsersService) {}

  upsertUserProfile(userId: string, data: any) {
    return this.usersService.upsertUserProfile(userId, data);
  }

  findUserById(userId: string) {
    return this.usersService.findUserById(userId);
  }

  addUserSavedAddress(
    userId: string,
    label: string,
    address: string,
    latitude: number,
    longitude: number,
    isDefault?: boolean,
    contactPhone?: string,
    pickupType?: 'now' | 'schedule',
    pickupAt?: string | null,
  ) {
    return this.usersService.addUserSavedAddress(
      userId,
      label,
      address,
      latitude,
      longitude,
      isDefault,
      contactPhone,
      pickupType,
      pickupAt,
    );
  }

  updateUserSavedAddress(userId: string, addressId: string, data: any) {
    return this.usersService.updateUserSavedAddress(userId, addressId, data);
  }

  deleteUserSavedAddress(userId: string, addressId: string) {
    return this.usersService.deleteUserSavedAddress(userId, addressId);
  }

  createOrder(userId: string, data: any) {
    return this.usersService.createOrder(userId, data);
  }

  getCustomerOrders(userId: string) {
    return this.usersService.getCustomerOrders(userId);
  }

  findOrderById(orderId: string) {
    return this.usersService.findOrderById(orderId);
  }

  updateOrder(orderId: string, data: any) {
    return this.usersService.updateOrder(orderId, data);
  }

  deleteOrder(orderId: string) {
    return this.usersService.deleteOrder(orderId);
  }

  updateOrderStatus(orderId: string, status: string) {
    return this.usersService.updateOrderStatus(orderId, status);
  }

  findCustomerByUserId(userId: string) {
    return this.usersService.findCustomerByUserId(userId);
  }

  createReview(customerId: string, dto: any) {
    return this.usersService.createReview(customerId, dto);
  }

  getCustomerReviews(customerId: string) {
    return this.usersService.getCustomerReviews(customerId);
  }

  findNearbyCustomers(longitude: number, latitude: number, maxDistance?: number) {
    return this.usersService.findNearbyCustomers(longitude, latitude, maxDistance);
  }
}
