import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'; 

import { HydratedDocument } from 'mongoose'; 

 

export type UserDocument = HydratedDocument<User>; 
export type UserRole = 'user' | 'admin' | 'rider';  // สามารถกำหนดประเภทผู้ใช้ในฐานข้อมูลได้ 
 

@Schema({ timestamps: true }) 

export class User { 

    @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true }) 

    email: string; 

 

    @Prop({ required: true, select: false }) 

    passwordHash: string; 
    @Prop({ required: true, enum: ['user', 'admin', 'rider'], default: 'user' }) 

    role: UserRole; 

     

    @Prop({ type: String, select: false, default: null }) 

    refreshTokenHash?: string | null; 

    @Prop({ type: String, trim: true, default: '' })
    firstName?: string;

    @Prop({ type: String, trim: true, default: '' })
    lastName?: string;

    @Prop({ type: String, default: '' })
    phoneNumber?: string;

    @Prop({ type: String, default: null })
    profileImage?: string | null;

    @Prop({ type: String, default: null })
    address?: string | null;

    @Prop({
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            default: [100.5018, 13.7563],
        },
    })
    location?: {
        type: 'Point';
        coordinates: number[];
    };

    @Prop({
        type: [
            {
                label: String,
                address: String,
                coordinates: [Number],
                isDefault: Boolean,
                contactPhone: String,
                pickupType: String,
                pickupAt: Date,
            },
        ],
        default: [],
    })
    savedAddresses?: Array<{
        label: string;
        address: string;
        coordinates: number[];
        isDefault: boolean;
        contactPhone?: string;
        pickupType?: 'now' | 'schedule';
        pickupAt?: Date | null;
    }>;


} 

 

export const UserSchema = SchemaFactory.createForClass(User); 