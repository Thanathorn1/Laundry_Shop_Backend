import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MapService } from './map.service';
import { MapController } from './map.controller';
import { Address, AddressSchema } from './schemas/address.schema';
import {
  OrderLocation,
  OrderLocationSchema,
} from './schemas/order-location.schema';
import {
  RiderLocation,
  RiderLocationSchema,
} from './schemas/rider-location.schema';
import { Shop, ShopSchema } from './schemas/shop.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Address.name, schema: AddressSchema },
      { name: OrderLocation.name, schema: OrderLocationSchema },
      { name: RiderLocation.name, schema: RiderLocationSchema },
      { name: Shop.name, schema: ShopSchema },
    ]),
  ],
  providers: [MapService],
  controllers: [MapController],
  exports: [MapService],
})
export class MapModule {}
