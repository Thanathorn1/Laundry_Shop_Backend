import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import {
  CreateCustomerDto,
  CreateReviewDto,
  CreateOrderDto,
  UpdateOrderDto,
} from './dto/create-customer.dto';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';

@Controller('customers')
export class CustomersController {
  constructor(private readonly usersService: UsersService) {}

  private toNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toImageList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    if (typeof value !== 'string' || !value.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      // keep as single string fallback
    }

    return [value];
  }

  private normalizeOrderPayload(body: any, files?: Array<{ filename: string }>) {
    const uploadedImages =
      files?.map((file) => `/uploads/customerorder/${file.filename}`) || [];
    const bodyImages = this.toImageList(body?.images);

    return {
      ...body,
      pickupLatitude: this.toNumber(body?.pickupLatitude),
      pickupLongitude: this.toNumber(body?.pickupLongitude),
      deliveryLatitude: this.toNumber(body?.deliveryLatitude),
      deliveryLongitude: this.toNumber(body?.deliveryLongitude),
      serviceTimeMinutes: this.toNumber(body?.serviceTimeMinutes),
      images: [...bodyImages, ...uploadedImages],
    };
  }

  private getAuthUserId(req: any): string {
    return req?.user?.userId || req?.user?.sub || req?.user?.id;
  }

  @UseGuards(AccessTokenGuard)
  @Post('register')
  async registerCustomer(@Request() req, @Body() dto: CreateCustomerDto) {
    const user = await this.usersService.upsertUserProfile(
      this.getAuthUserId(req),
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        profileImage: dto.profileImage,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
      },
    );
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
  async updateProfile(@Request() req, @Body() dto: CreateCustomerDto) {
    return this.usersService.upsertUserProfile(this.getAuthUserId(req), dto);
  }

  @UseGuards(AccessTokenGuard)
  @Post('addresses')
  async addSavedAddress(
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
  @Put('addresses/:addressId')
  async updateSavedAddress(
    @Request() req,
    @Param('addressId') addressId: string,
    @Body()
    body: {
      label?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      isDefault?: boolean;
    },
  ) {
    return this.usersService.updateUserSavedAddress(
      this.getAuthUserId(req),
      addressId,
      body,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Delete('addresses/:addressId')
  async deleteSavedAddress(
    @Request() req,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.deleteUserSavedAddress(
      this.getAuthUserId(req),
      addressId,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Post('orders')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads', 'customerorder');
          try {
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
          } catch {
            // ignore; multer will handle write errors
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const fileExt = extname(file.originalname || '').toLowerCase();
          cb(null, `order-${uniqueSuffix}${fileExt || '.jpg'}`);
        },
      }),
    }),
  )
  async createOrder(
    @Request() req,
    @Body() body: CreateOrderDto,
    @UploadedFiles() files: Array<{ filename: string }>,
  ) {
    const normalized = this.normalizeOrderPayload(body, files);
    return this.usersService.createOrder(this.getAuthUserId(req), normalized);
  }

  @UseGuards(AccessTokenGuard)
  @Get('orders')
  async getMyOrders(@Request() req) {
    return this.usersService.getCustomerOrders(this.getAuthUserId(req));
  }

  @UseGuards(AccessTokenGuard)
  @Put('orders/:orderId')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads', 'customerorder');
          try {
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
          } catch {
            // ignore; multer will handle write errors
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const fileExt = extname(file.originalname || '').toLowerCase();
          cb(null, `order-${uniqueSuffix}${fileExt || '.jpg'}`);
        },
      }),
    }),
  )
  async updateOrder(
    @Param('orderId') orderId: string,
    @Request() req,
    @Body() dto: UpdateOrderDto,
    @UploadedFiles() files: Array<{ filename: string }>,
  ) {
    const userId = this.getAuthUserId(req);
    const order = await this.usersService.findOrderById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId.toString() !== userId)
      throw new ForbiddenException('Not your order');
    if (order.status !== 'pending')
      throw new ForbiddenException('Only pending orders can be edited');
    const normalized = this.normalizeOrderPayload(dto, files);
    return this.usersService.updateOrder(orderId, normalized);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('orders/:orderId')
  async deleteOrder(@Param('orderId') orderId: string, @Request() req) {
    const userId = this.getAuthUserId(req);
    const order = await this.usersService.findOrderById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId.toString() !== userId)
      throw new ForbiddenException('Not your order');
    if (order.status !== 'pending')
      throw new ForbiddenException('Only pending orders can be deleted');
    return this.usersService.deleteOrder(orderId);
  }

  @UseGuards(AccessTokenGuard)
  @Put('orders/:orderId/status')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    return this.usersService.updateOrderStatus(orderId, body.status);
  }

  @UseGuards(AccessTokenGuard)
  @Post('reviews')
  async createReview(@Request() req, @Body() dto: CreateReviewDto) {
    const customer = await this.usersService.findCustomerByUserId(
      this.getAuthUserId(req),
    );
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return this.usersService.createReview(customer._id.toString(), dto);
  }

  @UseGuards(AccessTokenGuard)
  @Get('saved-addresses')
  async getSavedAddresses(@Request() req) {
    const user = await this.usersService.findUserById(this.getAuthUserId(req));
    if (!user) throw new NotFoundException('User not found');
    return user.savedAddresses || [];
  }

  @UseGuards(AccessTokenGuard)
  @Get('reviews')
  async getMyReviews(@Request() req) {
    const customer = await this.usersService.findCustomerByUserId(
      this.getAuthUserId(req),
    );
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return this.usersService.getCustomerReviews(customer._id.toString());
  }

  @Get('nearby')
  async getNearbyCustomers(
    @Body() body: { latitude: number; longitude: number; maxDistance?: number },
  ) {
    return this.usersService.findNearbyCustomers(
      body.longitude,
      body.latitude,
      body.maxDistance,
    );
  }
}
