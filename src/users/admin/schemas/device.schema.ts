import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DeviceDocument = HydratedDocument<Device>;

@Schema({ timestamps: true })
export class Device {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  deviceName: string;

  @Prop({ type: String, required: true })
  ipAddress: string;

  @Prop({ type: String, default: null })
  userAgent: string | null;

  @Prop({ type: Date, required: true })
  lastAccessedAt: Date;

  @Prop({ type: String, default: null })
  refreshToken: string | null;

  @Prop({ type: Boolean, default: false })
  isActive: boolean;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

DeviceSchema.index({ userId: 1 });
DeviceSchema.index({ ipAddress: 1 });
