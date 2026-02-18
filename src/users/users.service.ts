import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'; 

import { InjectModel } from '@nestjs/mongoose'; 

import { Model, Types } from 'mongoose'; 

import { User, UserDocument, UserRole } from './schemas/user.schema';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { Review, ReviewDocument } from './schemas/review.schema';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateCustomerDto } from './dto/create-customer.dto'; 

 

@Injectable() 

export class UsersService { 

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
        @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    ) { } 

 

    findByEmail(email: string) { 

        return this.userModel.findOne({ email }).exec(); 

    } 

     // ใช้ตอน login: ต้องดึง passwordHash และ refreshTokenHash 

    findByEmailWithSecrets(email: string) { 

        return this.userModel.findOne({ email }).select('+passwordHash +refreshTokenHash').exec(); 

    } 

 

    // ใช้ตอน refresh: ต้องดึง refreshTokenHash 

    findByIdWithRefresh(userId: string) { 

        return this.userModel.findById(userId).select('+refreshTokenHash').exec(); 

    } 

 

    // สร้างผู้ใช้ใหม่ โดยกำหนด role ได้ 

    create(data: { email: string; passwordHash: string; role?: UserRole }) { 

        return this.userModel.create({ 

            email: data.email, 

            passwordHash: data.passwordHash, 

            role: data.role ?? 'user', 

        }); 

    } 

 

    // อัพเดท refreshTokenHash 

    setRefreshTokenHash(userId: string, refreshTokenHash: string | null) { 

        return this.userModel.updateOne({ _id: userId }, { refreshTokenHash }).exec(); 

    } 

 

    // อัพเดทบทบาทผู้ใช้ 

    setRole(userId: string, role: UserRole) { 

        return this.userModel.updateOne({ _id: userId }, { role }).exec(); 

    }

    // ===== CUSTOMER METHODS =====

    findCustomerByUserId(userId: string) {
        return this.customerModel.findOne({ userId } as any).populate('userId').exec();
    }

    findCustomerById(customerId: string) {
        return this.customerModel.findById(new Types.ObjectId(customerId)).populate('userId').exec();
    }

    createCustomer(userId: string, data: Omit<CreateCustomerDto, 'email' | 'password'>) {
        const location = {
            type: 'Point' as const,
            coordinates: [data.longitude ?? 100.5018, data.latitude ?? 13.7563],
        };

        return this.customerModel.create({
            userId: userId as any,
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            profileImage: data.profileImage || null,
            location,
            address: data.address || null,
        });
    }

    updateCustomer(customerId: string, data: Partial<CreateCustomerDto>) {
        const updateData: any = {};

        if (data.firstName) updateData.firstName = data.firstName;
        if (data.lastName) updateData.lastName = data.lastName;
        if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
        if (data.profileImage) updateData.profileImage = data.profileImage;
        if (data.address) updateData.address = data.address;

        if (data.latitude && data.longitude) {
            updateData.location = {
                type: 'Point',
                coordinates: [data.longitude, data.latitude],
            };
        }

        return this.customerModel.findByIdAndUpdate(new Types.ObjectId(customerId), updateData, { new: true }).exec();
    }

    addSavedAddress(customerId: string, label: string, address: string, latitude: number, longitude: number, isDefault: boolean = false) {
        const newAddress = {
            label,
            address,
            coordinates: [longitude, latitude],
            isDefault,
        };

        if (isDefault) {
            return this.customerModel.findByIdAndUpdate(
                new Types.ObjectId(customerId),
                {
                    $set: { 'savedAddresses.$[].isDefault': false },
                    $push: { savedAddresses: newAddress },
                },
                { new: true },
            ).exec();
        }

        return this.customerModel.findByIdAndUpdate(
            new Types.ObjectId(customerId),
            { $push: { savedAddresses: newAddress } },
            { new: true },
        ).exec();
    }

    findNearbyCustomers(longitude: number, latitude: number, maxDistance: number = 5000) {
        return this.customerModel.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistance,
                },
            },
        }).exec();
    }

    // ===== ORDER METHODS =====

    createOrder(customerId: string, data: any) {
        const pickupLocation = {
            type: 'Point' as const,
            coordinates: [data.pickupLongitude, data.pickupLatitude],
        };

        const deliveryLocation = data.deliveryLatitude && data.deliveryLongitude ? {
            type: 'Point' as const,
            coordinates: [data.deliveryLongitude, data.deliveryLatitude],
        } : undefined;

        return this.orderModel.create({
            customerId: customerId as any,
            productName: data.productName,
            description: data.description || '',
            images: data.images || [],
            pickupLocation,
            pickupAddress: data.pickupAddress || null,
            deliveryLocation: deliveryLocation,
            deliveryAddress: data.deliveryAddress || null,
            status: 'pending',
        });
    }

    updateOrderStatus(orderId: string, status: string) {
        return this.orderModel.findByIdAndUpdate(
            orderId,
            { status, ...(status === 'completed' && { completedAt: new Date() }) },
            { new: true },
        ).exec();
    }

    getCustomerOrders(customerId: string, status?: string) {
        const query: any = { customerId };
        if (status) query.status = status;

        return this.orderModel.find(query).sort({ createdAt: -1 }).exec();
    }

    // ===== REVIEW METHODS =====

    createReview(customerId: string, data: any) {
        return this.reviewModel.create({
            customerId: customerId as any,
            reviewType: data.reviewType,
            targetId: data.targetId || null,
            rating: data.rating,
            comment: data.comment || '',
            isAnonymous: data.isAnonymous || false,
        });
    }

    getReviews(targetId: string, reviewType: string) {
        return this.reviewModel
            .find({ targetId, reviewType, status: 'approved' })
            .sort({ createdAt: -1 })
            .exec();
    }

    getCustomerReviews(customerId: string) {
        return this.reviewModel.find({ customerId } as any).sort({ createdAt: -1 }).exec();
    }

    updateAverageRating(customerId: string) {
        return this.reviewModel.aggregate([
            { $match: { customerId: new Types.ObjectId(customerId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                },
            },
        ]);
    }

}