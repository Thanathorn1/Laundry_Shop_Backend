import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({
    timestamps: true,
    collection: 'customerorders',
})
export class Order {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    customerId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', default: null })
    riderId?: Types.ObjectId | null;

    @Prop({
        required: true,
        enum: ['pending', 'accepted', 'picked-up', 'delivered', 'cancelled'],
        default: 'pending',
    })
    status: string;

    @Prop({ required: true })
    productName: string;

    @Prop({ required: true })
    contactPhone: string;

    @Prop()
    description?: string;

    @Prop({ type: [String], default: [] })
    images: string[];

    // ✅ FIXED HERE
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
    pickupLocation?: {
        type: 'Point';
        coordinates: [number, number]; // [lon, lat]
    };

    @Prop({ required: true })
    pickupAddress: string;

    @Prop({ required: true })
    pickupType: string;

    @Prop({ type: Date, default: null })
    pickupAt?: Date | null;

    @Prop({ default: null })
    deliveryAddress?: string | null;

    @Prop({ required: true, default: 0 })
    totalPrice: number;

    @Prop({ type: Date, default: null })
    completedAt?: Date | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// ✅ ADD THIS
OrderSchema.index({ pickupLocation: '2dsphere' });