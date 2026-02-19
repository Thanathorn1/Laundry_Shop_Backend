import { Module } from '@nestjs/common'; 

import { MongooseModule } from '@nestjs/mongoose'; 

import { UsersService } from './users.service'; 

import { User, UserSchema } from './admin/schemas/user.schema';
import { Customer, CustomerSchema } from './admin/schemas/customer.schema';
import { Review, ReviewSchema } from './admin/schemas/review.schema';
import { Order, OrderSchema } from './admin/schemas/order.schema';
import { CustomersController } from './customers.controller';
import { AdminUsersController } from './admin/admin-users.controller';

@Module({ 

  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],

  providers: [UsersService], 

  controllers: [CustomersController, AdminUsersController],

  exports: [UsersService], 

}) 

export class UsersModule { } 