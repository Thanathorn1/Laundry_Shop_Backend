import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Order } from './order.schema';

export type RatingDocument = HydratedDocument<Rating>;

@Schema({ timestamps: true })
export class Rating {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, unique: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Number, min: 1, max: 5, required: true })
  merchantRating: number;

  @Prop({ type: Number, min: 1, max: 5, required: true })
  riderRating: number;

  @Prop({ type: String, trim: true, default: '' })
  merchantComment: string;

  @Prop({ type: String, trim: true, default: '' })
  riderComment: string;

  @Prop({ type: String, default: null })
  merchantId: string | null;

  @Prop({ type: String, default: null })
  riderId: string | null;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ orderId: 1 });
RatingSchema.index({ customerId: 1 });
RatingSchema.index({ merchantId: 1 });
RatingSchema.index({ riderId: 1 });
