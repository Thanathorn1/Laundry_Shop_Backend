import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateCustomerDto, CreateReviewDto, CreateOrderDto } from './dto/create-customer.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';

@Controller('customers')
export class CustomersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AccessTokenGuard)
  @Post('register')
  async registerCustomer(@Request() req, @Body() dto: CreateCustomerDto) {
    // สมมติว่า user ถูกสร้างแล้วใน auth.service
    const customer = await this.usersService.createCustomer(req.user.sub, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      profileImage: dto.profileImage,
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address,
    });
    return customer;
  }

  @UseGuards(AccessTokenGuard)
  @Get('me')
  async getMyProfile(@Request() req) {
    const customer = await this.usersService.findCustomerByUserId(req.user.sub);
    if (!customer) {
      throw new Error('Customer profile not found');
    }
    return customer;
  }

  @UseGuards(AccessTokenGuard)
  @Put('update')
  async updateProfile(@Request() req, @Body() dto: CreateCustomerDto) {
    const customer = await this.usersService.findCustomerByUserId(req.user.sub);
    if (!customer) {
      throw new Error('Customer profile not found');
    }
    return this.usersService.updateCustomer(customer._id.toString(), dto);
  }

  @UseGuards(AccessTokenGuard)
  @Post('addresses')
  async addSavedAddress(
    @Request() req,
    @Body() body: { label: string; address: string; latitude: number; longitude: number; isDefault?: boolean },
  ) {
    const customer = await this.usersService.findCustomerByUserId(req.user.sub);
    if (!customer) {
      throw new Error('Customer profile not found');
    }
    return this.usersService.addSavedAddress(
      customer._id.toString(),
      body.label,
      body.address,
      body.latitude,
      body.longitude,
      body.isDefault,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Post('orders')
  async createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    const customer = await this.usersService.findCustomerByUserId(req.user.sub);
    if (!customer) {
      throw new Error('Customer profile not found');
    }
    return this.usersService.createOrder(customer._id.toString(), dto);
  }

  @UseGuards(AccessTokenGuard)
  @Get('orders')
  async getMyOrders(@Request() req) {
    const customer = await this.usersService.findCustomerByUserId(req.user.sub);
    if (!customer) {
      throw new Error('Customer profile not found');
    }
    return this.usersService.getCustomerOrders(customer._id.toString());
  }

  @UseGuards(AccessTokenGuard)
  @Put('orders/:orderId/status')
  async updateOrderStatus(@Param('orderId') orderId: string, @Body() body: { status: string }) {
    return this.usersService.updateOrderStatus(orderId, body.status);
  }

  @UseGuards(AccessTokenGuard)
  @Post('reviews')
  async createReview(@Request() req, @Body() dto: CreateReviewDto) {
    const customer = await this.usersService.findCustomerByUserId(req.user.sub);
    if (!customer) {
      throw new Error('Customer profile not found');
    }
    return this.usersService.createReview(customer._id.toString(), dto);
  }

  @UseGuards(AccessTokenGuard)
  @Get('saved-addresses')
  async getSavedAddresses(@Request() req) {
    const customer = await this.usersService.findCustomerByUserId(req.user.sub);
    if (!customer) {
      throw new Error('Customer profile not found');
    }
    return customer.savedAddresses || [];
  }

  @UseGuards(AccessTokenGuard)
  @Get('reviews')
  async getMyReviews(@Request() req) {
    const customer = await this.usersService.findCustomerByUserId(req.user.sub);
    if (!customer) {
      throw new Error('Customer profile not found');
    }
    return this.usersService.getCustomerReviews(customer._id.toString());
  }

  @Get('nearby')
  async getNearbyCustomers(@Body() body: { latitude: number; longitude: number; maxDistance?: number }) {
    return this.usersService.findNearbyCustomers(body.longitude, body.latitude, body.maxDistance);
  }
}
