import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as argon2 from 'argon2';
import { User, UserDocument, UserRole } from './admin/schemas/user.schema';
import { Customer, CustomerDocument } from './customer/schemas/customer.schema';
import { Review, ReviewDocument } from './customer/schemas/review.schema';
import { Order, OrderDocument } from './customer/schemas/order.schema';
import { Rating, RatingDocument } from './customer/schemas/rating.schema';
import { CreateCustomerDto } from './customer/dto/create-customer.dto';

type BanMode = 'unban' | 'permanent' | 'days';



@Injectable()

export class UsersService {

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
        @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    ) { }

    private ensureCustomerOrderUploadDir(): string {
        const uploadDir = path.join(process.cwd(), 'uploads', 'customerorder');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return uploadDir;
    }

    private dataUrlToFileExt(mimeType: string): string {
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
        if (mimeType === 'image/png') return 'png';
        if (mimeType === 'image/webp') return 'webp';
        if (mimeType === 'image/gif') return 'gif';
        return 'jpg';
    }

    private persistOrderImages(images?: string[]): string[] {
        if (!Array.isArray(images) || images.length === 0) return [];

        const uploadDir = this.ensureCustomerOrderUploadDir();

        return images.map((imageValue) => {
            if (typeof imageValue !== 'string') return imageValue as any;

            const dataUrlMatch = imageValue.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            if (!dataUrlMatch) {
                return imageValue;
            }

            const mimeType = dataUrlMatch[1];
            const base64Payload = dataUrlMatch[2];
            const ext = this.dataUrlToFileExt(mimeType);
            const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
            const absolutePath = path.join(uploadDir, fileName);

            fs.writeFileSync(absolutePath, Buffer.from(base64Payload, 'base64'));

            return `/uploads/customerorder/${fileName}`;
        });
    }



    findByEmail(email: string) {

        return this.userModel.findOne({ email }).exec();

    }

    // ใช้ตอน login: ต้องดึง passwordHash และ refreshTokenHash 

    findByEmailWithSecrets(email: string) {

        return this.userModel.findOne({ email }).select('+passwordHash +refreshTokenHash').exec();

    }

    findByEmailWithAuthSecrets(email: string) {
        return this.userModel
            .findOne({ email })
            .select('+passwordHash +refreshTokenHash isBanned banStartAt banEndAt')
            .exec();
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

    async listUsersByRole(role: UserRole) {
        const users = await this.userModel
            .find({ role })
            .select('-passwordHash -refreshTokenHash')
            .sort({ createdAt: -1 })
            .exec();

        const now = new Date();
        for (const user of users) {
            if (user.isBanned && user.banEndAt && user.banEndAt <= now) {
                await this.userModel.updateOne(
                    { _id: user._id },
                    { $set: { isBanned: false, banStartAt: null, banEndAt: null } },
                ).exec();
                user.isBanned = false;
                user.banStartAt = null;
                user.banEndAt = null;
            }
        }

        return users;
    }

    async adminChangeUserRole(userId: string, role: UserRole) {
        const updated = await this.userModel
            .findByIdAndUpdate(userId, { $set: { role } }, { new: true })
            .select('-passwordHash -refreshTokenHash')
            .exec();
        if (!updated) throw new NotFoundException('User not found');
        return updated;
    }

    async adminSetUserBan(userId: string, payload: { mode: BanMode; days?: number }) {
        const now = new Date();
        let updateData: any;

        if (payload.mode === 'unban') {
            updateData = { isBanned: false, banStartAt: null, banEndAt: null };
        } else if (payload.mode === 'permanent') {
            updateData = { isBanned: true, banStartAt: now, banEndAt: null };
        } else {
            const days = Number(payload.days);
            if (!Number.isFinite(days) || days <= 0) {
                throw new BadRequestException('Days must be a number greater than 0');
            }
            const banEndAt = new Date(now.getTime() + Math.floor(days) * 24 * 60 * 60 * 1000);
            updateData = { isBanned: true, banStartAt: now, banEndAt };
        }

        const updated = await this.userModel
            .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
            .select('-passwordHash -refreshTokenHash')
            .exec();
        if (!updated) throw new NotFoundException('User not found');
        return updated;
    }

    async enforceBanStateForSignIn(user: UserDocument) {
        if (!user.isBanned) return false;

        if (user.banEndAt && new Date(user.banEndAt) <= new Date()) {
            await this.userModel.updateOne(
                { _id: user._id },
                { $set: { isBanned: false, banStartAt: null, banEndAt: null } },
            ).exec();
            return false;
        }

        return true;
    }

    async adminChangeUserPassword(userId: string, newPassword: string) {
        if (!newPassword || newPassword.trim().length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        const passwordHash = await argon2.hash(newPassword.trim());
        const updated = await this.userModel
            .findByIdAndUpdate(
                userId,
                { $set: { passwordHash, refreshTokenHash: null } },
                { new: true },
            )
            .select('-passwordHash -refreshTokenHash')
            .exec();
        if (!updated) throw new NotFoundException('User not found');
        return { success: true, user: updated };
    }

    async adminDeleteUser(userId: string) {
        const deletedUser = await this.userModel.findByIdAndDelete(userId).exec();
        if (!deletedUser) throw new NotFoundException('User not found');

        const customer = await this.customerModel.findOneAndDelete({ userId: deletedUser._id as any }).exec();
        await this.customerModel.findOneAndDelete({ userId: String(deletedUser._id) as any }).exec();
        await this.orderModel.deleteMany({ customerId: deletedUser._id as any }).exec();
        await this.orderModel.deleteMany({ customerId: String(deletedUser._id) as any }).exec();

        if (customer?._id) {
            await this.reviewModel.deleteMany({ customerId: customer._id as any }).exec();
            await this.reviewModel.deleteMany({ customerId: String(customer._id) as any }).exec();
        }

        return { success: true };
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

    async createOrder(userId: string, data: any) {
        // Resolve Customer profile ID to link the order properly
        const userObjectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
        const customer = await this.customerModel.findOne({ userId: userObjectId || userId } as any).exec();
        const primaryId = customer?._id || userObjectId || userId;

        const pickupLocation = {
            type: 'Point' as const,
            coordinates: [data.pickupLongitude, data.pickupLatitude],
        };

        const deliveryLocation = data.deliveryLatitude && data.deliveryLongitude ? {
            type: 'Point' as const,
            coordinates: [data.deliveryLongitude, data.deliveryLatitude],
        } : undefined;

        const savedImages = this.persistOrderImages(data.images);

        return this.orderModel.create({
            customerId: primaryId as any,
            productName: data.productName,
            contactPhone: data.contactPhone || '',
            description: data.description || '',
            images: savedImages,
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

    async updateOrder(orderId: string, data: any) {
        const updateData: any = {};
        if (data.productName) updateData.productName = data.productName;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.images !== undefined) updateData.images = this.persistOrderImages(data.images);
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

    async getUserOwnedIds(userId: string): Promise<Types.ObjectId[]> {
        if (!userId) return [];
        const userObjectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
        if (!userObjectId) return [];

        const ids: Types.ObjectId[] = [userObjectId];

        // Find customer profile to get customer ID as well
        const customer = await this.customerModel.findOne({ userId: userObjectId } as any).exec();
        if (customer?._id) {
            ids.push(customer._id as Types.ObjectId);
        }

        return ids;
    }

    async isOrderOwner(orderId: string, userId: string): Promise<boolean> {
        if (!orderId || !userId) return false;

        const order = await this.orderModel.findById(orderId).exec();
        if (!order) return false;

        const ownedIds = await this.getUserOwnedIds(userId);
        const ownedIdsStrings = ownedIds.map((id) => id.toString());

        return ownedIdsStrings.includes(order.customerId.toString());
    }

    async getCustomerOrders(userId: string, status?: string) {
        const possibleIds = await this.getUserOwnedIds(userId);
        if (possibleIds.length === 0) return [];

        const query: any = {
            customerId: { $in: possibleIds }
        };

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

    // ===== PROFILE IMAGE UPLOAD =====
    async uploadProfileImage(userId: string, file: any): Promise<string> {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'profile');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `${userId}-${Date.now()}-${Math.random().toString(16).slice(2)}${path.extname(file.originalname)}`;
        const filePath = path.join(uploadsDir, fileName);

        fs.writeFileSync(filePath, file.buffer);
        const imageUrl = `/uploads/profile/${fileName}`;

        await this.userModel.findByIdAndUpdate(
            userId,
            { profileImage: imageUrl },
            { new: true },
        ).exec();

        return imageUrl;
    }

    // ===== SAVED ADDRESS METHODS =====
    async setDefaultAddress(userId: string, addressIndex: number) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');
        if (!user.savedAddresses || !user.savedAddresses[addressIndex]) {
            throw new NotFoundException('Address not found');
        }

        // Unset all addresses as default
        user.savedAddresses.forEach((addr) => {
            addr.isDefault = false;
        });

        // Set the selected address as default
        user.savedAddresses[addressIndex].isDefault = true;
        await user.save();

        return user.savedAddresses[addressIndex];
    }

    async deleteSavedAddress(userId: string, addressIndex: number) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');
        if (!user.savedAddresses || !user.savedAddresses[addressIndex]) {
            throw new NotFoundException('Address not found');
        }

        user.savedAddresses.splice(addressIndex, 1);
        await user.save();
        return true;
    }

    // ===== SECURITY METHODS =====
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
        const user = await this.userModel.findById(userId).select('+passwordHash').exec();
        if (!user) throw new NotFoundException('User not found');

        // Verify current password
        const isPasswordValid = await argon2.verify(user.passwordHash, currentPassword);
        if (!isPasswordValid) return false;

        // Check if new password is same as current
        if (await argon2.verify(user.passwordHash, newPassword)) {
            throw new BadRequestException('New password cannot be same as current password');
        }

        // Hash and update new password
        const hashedPassword = await argon2.hash(newPassword);
        await this.userModel.findByIdAndUpdate(userId, { passwordHash: hashedPassword }).exec();
        return true;
    }

    async getUserDevices(userId: string, req: any): Promise<any[]> {
        const user = await this.userModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');

        // For now, return a mock device structure
        // In production, you would track devices in a separate Device collection
        const currentDeviceId = userId + '-current';
        return [
            {
                id: currentDeviceId,
                deviceName: req.headers['user-agent'] || 'Unknown Device',
                lastAccessedAt: new Date().toISOString(),
                ipAddress: req.ip || '0.0.0.0',
                isCurrent: true,
            },
        ];
    }

    async logoutFromDevice(userId: string, deviceId: string): Promise<void> {
        // In production, you would remove the device from the Device collection
        // For now, this is a placeholder implementation
        const user = await this.userModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');
    }

    // ===== RATING METHODS =====
    async rateOrder(orderId: string, data: any): Promise<any> {
        const order = await this.orderModel.findById(orderId).exec();
        if (!order) throw new NotFoundException('Order not found');

        // Update order with rating
        order.hasRating = true;
        order.rating = {
            merchantRating: data.merchantRating,
            riderRating: data.riderRating,
            merchantComment: data.merchantComment || '',
            riderComment: data.riderComment || '',
        };

        await order.save();

        return {
            orderId: order._id,
            merchantRating: data.merchantRating,
            riderRating: data.riderRating,
            merchantComment: data.merchantComment || '',
            riderComment: data.riderComment || '',
            createdAt: (order as any).createdAt || new Date(),
            updatedAt: (order as any).updatedAt || new Date(),
        };
    }

    // ===== PAGINATION SUPPORT =====
    async getCustomerOrdersPaginated(
        userId: string,
        status?: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<any> {
        const possibleIds = await this.getUserOwnedIds(userId);
        if (possibleIds.length === 0) return { orders: [], total: 0, limit, offset };

        const query: any = {
            customerId: { $in: possibleIds }
        };

        if (status) query.status = status;

        const orders = await this.orderModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(offset)
            .exec();

        const total = await this.orderModel.countDocuments(query as any).exec();

        return {
            orders,
            total,
            limit,
            offset,
        };
    }

}