import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RiderService } from './rider.service';
import { RiderController } from './rider.controller';
import { Order, OrderSchema } from '../../orders/schemas/order.schema';
import { RiderProfile, RiderProfileSchema } from './schemas/rider-profile.schema';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema, collection: 'customerorders' },
            { name: RiderProfile.name, schema: RiderProfileSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [RiderController],
    providers: [RiderService],
    exports: [RiderService],
})
export class RiderModule { }
