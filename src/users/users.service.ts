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

    findUserById(userId: string) {
        return this.userModel.findById(userId).exec();
    }

    listUsersByRole(role: UserRole) {
        return this.userModel
            .find({ role })
            .select('-passwordHash -refreshTokenHash')
            .sort({ createdAt: -1 })
            .exec();
    }

    async upsertUserProfile(userId: string, data: Partial<CreateCustomerDto>) {
        const updateData: any = {};
        if (data.firstName !== undefined) updateData.firstName = data.firstName;
        if (data.lastName !== undefined) updateData.lastName = data.lastName;
        if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
        if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.latitude !== undefined && data.longitude !== undefined) {
            updateData.location = {
                type: 'Point',
                coordinates: [data.longitude, data.latitude],
            };
        }

        await this.userModel.updateOne({ _id: userId }, { $set: updateData }).exec();
        return this.userModel.findById(userId).exec();
    }

    async addUserSavedAddress(
        userId: string,
        label: string,
        address: string,
        latitude: number,
        longitude: number,
        isDefault: boolean = false,
        contactPhone?: string,
        pickupType?: 'now' | 'schedule',
        pickupAt?: string | null,
    ) {
        const trimmedLabel = label.trim();
        const labelKey = trimmedLabel.toLowerCase();

        const newAddress = {
            label: trimmedLabel,
            address,
            coordinates: [longitude, latitude],
            isDefault,
            contactPhone: contactPhone || '',
            pickupType: pickupType || 'now',
            pickupAt: pickupAt ? new Date(pickupAt) : null,
        };

        const user = await this.userModel.findById(userId).select('savedAddresses').lean().exec();
        const currentAddresses = (user?.savedAddresses || []) as any[];

        let mergedAddresses = currentAddresses.filter((item) => {
            const itemLabel = typeof item?.label === 'string' ? item.label.trim().toLowerCase() : '';
            return itemLabel !== labelKey;
        });

        if (isDefault) {
            mergedAddresses = mergedAddresses.map((item) => ({
                ...item,
                isDefault: false,
            }));
        }

        mergedAddresses.push(newAddress);

        return this.userModel.findByIdAndUpdate(
            userId,
            { $set: { savedAddresses: mergedAddresses } },
            { new: true },
        ).exec();
    }

    // ===== CUSTOMER METHODS =====

    findCustomerByUserId(userId: string) {
        const query = Types.ObjectId.isValid(userId)
            ? { $or: [{ userId: new Types.ObjectId(userId) }, { userId }] }
            : { userId };

        return this.customerModel.findOne(query as any).populate('userId').exec();
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
            userId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : (userId as any),
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
            customerId: Types.ObjectId.isValid(customerId) ? new Types.ObjectId(customerId) : (customerId as any),
            productName: data.productName,
            contactPhone: data.contactPhone || '',
            description: data.description || '',
            images: data.images || [],
            pickupLocation,
            pickupAddress: data.pickupAddress || null,
            pickupType: data.pickupType || 'now',
            pickupAt: data.pickupAt ? new Date(data.pickupAt) : null,
            ...(deliveryLocation ? { deliveryLocation } : {}),
            deliveryAddress: data.deliveryAddress || null,
            status: 'pending',
        });
    }

    findOrderById(orderId: string) {
        return this.orderModel.findById(orderId).exec();
    }

    updateOrder(orderId: string, data: any) {
        const updateData: any = {};
        if (data.productName) updateData.productName = data.productName;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.images !== undefined) updateData.images = data.images;
        if (data.contactPhone) updateData.contactPhone = data.contactPhone;
        if (data.pickupAddress !== undefined) updateData.pickupAddress = data.pickupAddress;
        if (data.pickupType) updateData.pickupType = data.pickupType;
        if (data.pickupAt !== undefined) updateData.pickupAt = data.pickupAt ? new Date(data.pickupAt) : null;
        if (data.pickupLatitude !== undefined && data.pickupLongitude !== undefined) {
            updateData.pickupLocation = {
                type: 'Point',
                coordinates: [data.pickupLongitude, data.pickupLatitude],
            };
        }
        return this.orderModel.findByIdAndUpdate(orderId, updateData, { new: true }).exec();
    }

    deleteOrder(orderId: string) {
        return this.orderModel.findByIdAndDelete(orderId).exec();
    }

    updateOrderStatus(orderId: string, status: string) {
        return this.orderModel.findByIdAndUpdate(
            orderId,
            { status, ...(status === 'completed' && { completedAt: new Date() }) },
            { new: true },
        ).exec();
    }

    getCustomerOrders(customerId: string, status?: string) {
        const query: any = Types.ObjectId.isValid(customerId)
            ? { $or: [{ customerId: new Types.ObjectId(customerId) }, { customerId }] }
            : { customerId };
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