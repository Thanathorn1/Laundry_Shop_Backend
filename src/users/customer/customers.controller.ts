import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { File } from 'multer';
import { UsersService } from '../users.service';
import {
  CreateCustomerDto,
  CreateReviewDto,
  CreateOrderDto,
  UpdateOrderDto,
} from './dto/create-customer.dto';
import {
  UpdateProfileDto,
  ProfileResponseDto,
  ProfileImageResponseDto,
  SavedAddressesResponseDto,
  CreateSavedAddressDto,
} from './dto/profile.dto';
import {
  ChangePasswordDto,
  ChangePasswordResponseDto,
  DevicesResponseDto,
  LogoutDeviceResponseDto,
  CreateRatingDto,
  CreateRatingResponseDto,
} from './dto/security.dto';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';

@Controller('customers')
export class CustomersController {
  constructor(private readonly usersService: UsersService) { }

  private getAuthUserId(req: any): string {
    return req?.user?.userId || req?.user?.sub || req?.user?.id;
  }

  private parseAddressIndex(addressId: string): number {
    // Support both "address_0" format and plain numeric "0" format
    const raw = addressId.startsWith('address_')
      ? addressId.replace('address_', '')
      : addressId;
    const index = parseInt(raw, 10);
    if (isNaN(index)) {
      throw new BadRequestException(`Invalid address ID: ${addressId}`);
    }
    return index;
  }

  // ============ Profile Management ============

  @UseGuards(AccessTokenGuard)
  @Get('profile')
  async getProfile(@Request() req): Promise<ProfileResponseDto> {
    const userId = this.getAuthUserId(req);
    const user = await this.usersService.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user._id.toString(),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      phoneVerified: user.phoneVerified || false,
      profileImageUrl: user.profileImage || undefined,
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    };
  }

  @UseGuards(AccessTokenGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const userId = this.getAuthUserId(req);
    const updated = await this.usersService.upsertUserProfile(userId, dto);
    if (!updated) throw new NotFoundException('User not found');

    return {
      id: updated._id.toString(),
      firstName: updated.firstName || '',
      lastName: updated.lastName || '',
      email: updated.email,
      phoneNumber: updated.phoneNumber || '',
      phoneVerified: updated.phoneVerified || false,
      profileImageUrl: updated.profileImage || undefined,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }

  @UseGuards(AccessTokenGuard)
  @Patch('profile/upload')
  @UseInterceptors(FileInterceptor('profileImage'))
  async uploadProfileImage(
    @Request() req,
    @UploadedFile() file: File,
  ): Promise<ProfileImageResponseDto> {
    const userId = this.getAuthUserId(req);
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const imageUrl = await this.usersService.uploadProfileImage(userId, file);
    return {
      profileImageUrl: imageUrl,
      message: 'Profile image uploaded successfully',
    };
  }

  // ============ Saved Addresses ============

  @UseGuards(AccessTokenGuard)
  @Get('saved-addresses')
  async getSavedAddresses(@Request() req): Promise<SavedAddressesResponseDto> {
    const userId = this.getAuthUserId(req);
    const user = await this.usersService.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    const addresses = (user.savedAddresses || []).map((addr, index) => ({
      id: `address_${index}`,
      label: addr.label,
      address: addr.address,
      latitude: addr.coordinates[1],
      longitude: addr.coordinates[0],
      isDefault: addr.isDefault,
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    }));

    return { addresses };
  }

  @UseGuards(AccessTokenGuard)
  @Post('saved-addresses')
  async createSavedAddress(
    @Request() req,
    @Body() dto: CreateSavedAddressDto,
  ) {
    return this.usersService.addUserSavedAddress(
      this.getAuthUserId(req),
      dto.label,
      dto.address,
      dto.latitude,
      dto.longitude,
      dto.isDefault,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Patch('saved-addresses/:id/default')
  async setDefaultAddress(@Param('id') addressId: string, @Request() req) {
    const userId = this.getAuthUserId(req);
    const index = this.parseAddressIndex(addressId);
    return this.usersService.setDefaultAddress(userId, index);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('saved-addresses/:id')
  async deleteSavedAddress(@Param('id') addressId: string, @Request() req) {
    const userId = this.getAuthUserId(req);
    const index = this.parseAddressIndex(addressId);
    await this.usersService.deleteSavedAddress(userId, index);
    return { success: true, message: 'Address deleted successfully' };
  }

  // ============ Security Settings ============

  @UseGuards(AccessTokenGuard)
  @Post('security/change-password')
  async changePassword(
    @Request() req,
    @Body() dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    const userId = this.getAuthUserId(req);
    const isPasswordChanged = await this.usersService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );

    if (!isPasswordChanged) {
      throw new BadRequestException('Current password is incorrect');
    }

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @UseGuards(AccessTokenGuard)
  @Get('security/devices')
  async getDevices(@Request() req): Promise<DevicesResponseDto> {
    const userId = this.getAuthUserId(req);
    const devices = await this.usersService.getUserDevices(userId, req);
    return { devices };
  }

  @UseGuards(AccessTokenGuard)
  @Post('security/devices/:id/logout')
  async logoutDevice(
    @Param('id') deviceId: string,
    @Request() req,
  ): Promise<LogoutDeviceResponseDto> {
    const userId = this.getAuthUserId(req);
    await this.usersService.logoutFromDevice(userId, deviceId);
    return {
      success: true,
      message: 'Logged out from device successfully',
    };
  }

  // ============ Orders ============

  @UseGuards(AccessTokenGuard)
  @Get('orders')
  async getMyOrders(
    @Request() req,
    @Query('status') status?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const result = await this.usersService.getCustomerOrdersPaginated(
      this.getAuthUserId(req),
      status,
      limit,
      offset,
    );
    return result;
  }

  @UseGuards(AccessTokenGuard)
  @Get('orders/:id')
  async getOrderDetails(@Param('id') orderId: string, @Request() req) {
    const userId = this.getAuthUserId(req);
    const isOwner = await this.usersService.isOrderOwner(orderId, userId);
    if (!isOwner) throw new ForbiddenException('Not your order');

    const order = await this.usersService.findOrderById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  @UseGuards(AccessTokenGuard)
  @Post('orders/:id/rating')
  async rateOrder(
    @Param('id') orderId: string,
    @Request() req,
    @Body() dto: CreateRatingDto,
  ): Promise<CreateRatingResponseDto> {
    const userId = this.getAuthUserId(req);
    const isOwner = await this.usersService.isOrderOwner(orderId, userId);
    if (!isOwner) throw new ForbiddenException('Not your order');

    const order = await this.usersService.findOrderById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'completed') {
      throw new BadRequestException('Only completed orders can be rated');
    }
    if (order.hasRating) {
      throw new ConflictException('This order has already been rated');
    }

    const rating = await this.usersService.rateOrder(orderId, dto);
    return {
      success: true,
      rating: {
        orderId: rating.orderId.toString(),
        merchantRating: rating.merchantRating,
        riderRating: rating.riderRating,
        merchantComment: rating.merchantComment || undefined,
        riderComment: rating.riderComment || undefined,
        createdAt: new Date(rating.createdAt).toISOString(),
        updatedAt: new Date(rating.updatedAt).toISOString(),
      },
    };
  }

  // ============ Legacy Endpoints (kept for backward compatibility) ============

  @UseGuards(AccessTokenGuard)
  @Post('register')
  async registerCustomer(@Request() req, @Body() dto: CreateCustomerDto) {
    const user = await this.usersService.upsertUserProfile(this.getAuthUserId(req), {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      profileImage: dto.profileImage,
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address,
    });
    return user;
  }

  @UseGuards(AccessTokenGuard)
  @Get('me')
  async getMyProfile(@Request() req) {
    const user = await this.usersService.findUserById(this.getAuthUserId(req));
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @UseGuards(AccessTokenGuard)
  @Put('update')
  async updateProfileLegacy(@Request() req, @Body() dto: CreateCustomerDto) {
    return this.usersService.upsertUserProfile(this.getAuthUserId(req), dto);
  }

  @UseGuards(AccessTokenGuard)
  @Post('addresses')
  async addSavedAddressLegacy(
    @Request() req,
    @Body()
    body: {
      label: string;
      address: string;
      latitude: number;
      longitude: number;
      isDefault?: boolean;
      contactPhone?: string;
      pickupType?: 'now' | 'schedule';
      pickupAt?: string | null;
    },
  ) {
    return this.usersService.addUserSavedAddress(
      this.getAuthUserId(req),
      body.label,
      body.address,
      body.latitude,
      body.longitude,
      body.isDefault,
      body.contactPhone,
      body.pickupType,
      body.pickupAt,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Post('orders')
  async createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    return this.usersService.createOrder(this.getAuthUserId(req), dto);
  }

  @UseGuards(AccessTokenGuard)
  @Put('orders/:orderId')
  async updateOrder(@Param('orderId') orderId: string, @Request() req, @Body() dto: UpdateOrderDto) {
    const userId = this.getAuthUserId(req);
    const isOwner = await this.usersService.isOrderOwner(orderId, userId);
    if (!isOwner) throw new ForbiddenException('Not your order');

    const order = await this.usersService.findOrderById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'pending') throw new ForbiddenException('Only pending orders can be edited');
    return this.usersService.updateOrder(orderId, dto);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('orders/:orderId')
  async deleteOrder(@Param('orderId') orderId: string, @Request() req) {
    const userId = this.getAuthUserId(req);
    const isOwner = await this.usersService.isOrderOwner(orderId, userId);
    if (!isOwner) throw new ForbiddenException('Not your order');

    const order = await this.usersService.findOrderById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'pending') throw new ForbiddenException('Only pending orders can be deleted');
    return this.usersService.deleteOrder(orderId);
  }

  @UseGuards(AccessTokenGuard)
  @Put('orders/:orderId/status')
  async updateOrderStatus(@Param('orderId') orderId: string, @Body() body: { status: string }) {
    return this.usersService.updateOrderStatus(orderId, body.status);
  }

  @UseGuards(AccessTokenGuard)
  @Post('reviews')
  async createReview(@Request() req, @Body() dto: CreateReviewDto) {
    const customer = await this.usersService.findCustomerByUserId(this.getAuthUserId(req));
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return this.usersService.createReview(customer._id.toString(), dto);
  }

  @UseGuards(AccessTokenGuard)
  @Get('reviews')
  async getMyReviews(@Request() req) {
    const customer = await this.usersService.findCustomerByUserId(this.getAuthUserId(req));
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return this.usersService.getCustomerReviews(customer._id.toString());
  }

  @Get('nearby')
  async getNearbyCustomers(@Body() body: { latitude: number; longitude: number; maxDistance?: number }) {
    return this.usersService.findNearbyCustomers(body.longitude, body.latitude, body.maxDistance);
  }
}
