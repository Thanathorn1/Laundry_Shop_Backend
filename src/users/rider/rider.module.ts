import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RiderService } from './rider.service';
import { RiderController } from './rider.controller';
import { Order, OrderSchema } from '../customer/schemas/order.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { UsersCoreModule } from '../users-core.module';
import { RealtimeModule } from '../../realtime/realtime.module';

@Module({
  imports: [
    UsersCoreModule,
    RealtimeModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RiderController],
  providers: [RiderService],
  exports: [RiderService],
})
export class RiderModule {}
