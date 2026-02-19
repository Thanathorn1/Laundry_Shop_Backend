import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'shops', timestamps: true })
export class Shop extends Document {
  @Prop({ required: true, default: 'Laundry Shop' })
  shopName: string;

  @Prop({ default: '' })
  label?: string;

  @Prop({ default: '' })
  phoneNumber?: string;

  @Prop({ default: '' })
  photoImage?: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop({
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },
  })
  location: { type: string; coordinates: number[] };
}

export const ShopSchema = SchemaFactory.createForClass(Shop);
ShopSchema.index({ location: '2dsphere' });
