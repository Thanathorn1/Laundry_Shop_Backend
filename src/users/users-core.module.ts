import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { UsersService } from './users.service';
import { User, UserSchema } from './admin/schemas/user.schema';
import { Customer, CustomerSchema } from './customer/schemas/customer.schema';
import { Review, ReviewSchema } from './customer/schemas/review.schema';
import { Order, OrderSchema } from './customer/schemas/order.schema';
import { Shop, ShopSchema } from '../map/schemas/shop.schema';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    RealtimeModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Shop.name, schema: ShopSchema },
    ]),
  ],

  providers: [UsersService],

  exports: [UsersService],
})
export class UsersCoreModule {}
