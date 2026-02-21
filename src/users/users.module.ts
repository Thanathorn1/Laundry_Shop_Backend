import { Module } from '@nestjs/common'; 

import { MongooseModule } from '@nestjs/mongoose'; 

import { UsersService } from './users.service'; 
import { User, UserSchema } from './admin/schemas/user.schema';
import { Customer, CustomerSchema } from './customer/schemas/customer.schema';
import { Review, ReviewSchema } from './customer/schemas/review.schema';
import { Order, OrderSchema } from './customer/schemas/order.schema';
import { Rating, RatingSchema } from './customer/schemas/rating.schema';
import { Device, DeviceSchema } from './admin/schemas/device.schema';
import { CustomersController } from './customer/customers.controller';
import { AdminUsersController } from './admin/admin-users.controller';

@Module({ 

  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Rating.name, schema: RatingSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
  ],

  providers: [UsersService], 

  controllers: [CustomersController, AdminUsersController],

  exports: [UsersService], 

}) 

export class UsersModule { } 