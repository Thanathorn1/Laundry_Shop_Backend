import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Customer } from './customer.schema';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ collection: 'customerorders', timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Customer;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, required: true, default: '' })
  contactPhone: string;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({
    type: [String],
    default: [],
  })
  images: string[];

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  pickupLocation: {
    type: 'Point';
    coordinates: number[];
  };

  @Prop({ type: String, default: null })
  pickupAddress: string | null;

  @Prop({ type: String, enum: ['now', 'schedule'], default: 'now' })
  pickupType: 'now' | 'schedule';

  @Prop({ type: Date, default: null })
  pickupAt: Date | null;

  @Prop({ type: Object })
  deliveryLocation?: {
    type: 'Point';
    coordinates: number[];
  };

  @Prop({ type: String, default: null })
  deliveryAddress: string | null;

  @Prop({ type: String, enum: ['pending', 'assigned', 'picked_up', 'completed', 'cancelled'], default: 'pending' })
  status: 'pending' | 'assigned' | 'picked_up' | 'completed' | 'cancelled';

  @Prop({ type: String, default: null })
  riderId: string | null;

  @Prop({ type: Number, default: 0 })
  totalPrice: number;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ customerId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ riderId: 1 });
OrderSchema.index({ 'pickupLocation': '2dsphere' });
