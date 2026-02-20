import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'rider_locations', timestamps: true })
export class RiderLocation extends Document {
  @Prop({ required: true, unique: true })
  riderId: string;

  @Prop({
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },
  })
  location: { type: string; coordinates: number[] };

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const RiderLocationSchema = SchemaFactory.createForClass(RiderLocation);
RiderLocationSchema.index({ location: '2dsphere' });
