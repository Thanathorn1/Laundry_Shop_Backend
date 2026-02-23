import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../../orders/schemas/order.schema';
import {
    RiderProfile,
    RiderProfileDocument,
} from './schemas/rider-profile.schema';
import { RiderProfileDto } from './dto/rider-profile.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RiderService {
    constructor(
        @InjectModel(Order.name)
        private orderModel: Model<OrderDocument>,

        @InjectModel(RiderProfile.name)
        private riderProfileModel: Model<RiderProfileDocument>,

        private configService: ConfigService,
    ) { }

    // ================= FILE DELETE =================
    public deleteFile(relativePath: string) {
        if (!relativePath) return;

        const fileName = path.basename(relativePath);
        const absolutePath = path.join(
            process.cwd(),
            'uploads',
            'rider',
            fileName,
        );

        if (fs.existsSync(absolutePath)) {
            try {
                fs.unlinkSync(absolutePath);
            } catch (err) {
                console.error('Delete failed:', err);
            }
        }
    }

    // ================= PROFILE =================
    async getProfile(riderId: string) {
        if (!Types.ObjectId.isValid(riderId)) {
            throw new BadRequestException('Invalid rider ID');
        }

        const profile = await this.riderProfileModel
            .findOne({ rider: new Types.ObjectId(riderId) })
            .populate('rider', 'email role')
            .exec();

        if (!profile) {
            throw new NotFoundException('Rider profile not found');
        }

        return profile;
    }

    async findAllRiders() {
        return this.riderProfileModel
            .find()
            .populate('rider', 'email role')
            .exec();
    }

    // ================= AVAILABLE ORDERS =================
    async findAvailableOrders() {
        const orders = await this.orderModel.find({
            status: 'pending',
            riderId: null,
        });

        return orders.map((order) => {
            let lat = null;
            let lon = null;

            if (
                order.pickupLocation &&
                order.pickupLocation.coordinates &&
                order.pickupLocation.coordinates.length === 2
            ) {
                // Mongo GeoJSON format = [longitude, latitude]
                lon = order.pickupLocation.coordinates[0];
                lat = order.pickupLocation.coordinates[1];
            }

            return {
                _id: order._id,
                customerName: order.productName,
                pickupAddress: order.pickupAddress,
                deliveryAddress: order.deliveryAddress,
                totalPrice: order.totalPrice,
                status: order.status,
                location: lat && lon ? { lat, lon } : null,
                pickupLocation: order.pickupLocation,
            };
        });
    }

    async findRiderTasks(riderId: string) {
        if (!Types.ObjectId.isValid(riderId)) {
            throw new BadRequestException('Invalid rider ID');
        }

        const orders = await this.orderModel
            .find({ riderId: new Types.ObjectId(riderId) })
            .populate('customerId', 'email')
            .sort({ createdAt: -1 })
            .exec();

        return orders.map((order) => {
            const doc = order.toObject();
            const loc = doc.pickupLocation;
            // Ensure location object exists for frontend
            const lat = loc?.coordinates?.[1];
            const lon = loc?.coordinates?.[0];

            return {
                ...doc,
                customerName: doc.productName,
                location: lat && lon ? { lat, lon } : null,
            };
        });
    }

    // ================= ACCEPT ORDER =================
    async acceptOrder(orderId: string, riderId: string) {
        if (!Types.ObjectId.isValid(orderId)) {
            throw new BadRequestException('Invalid order ID');
        }

        const order = await this.orderModel.findById(orderId);

        if (!order) throw new NotFoundException('Order not found');

        if (order.status !== 'pending') {
            throw new BadRequestException('Order not pending');
        }

        if (order.riderId) {
            throw new BadRequestException('Order already taken');
        }

        order.riderId = new Types.ObjectId(riderId);
        order.status = 'assigned';

        return order.save();
    }

    // ================= UPDATE STATUS =================
    async updateStatus(orderId: string, riderId: string, status: OrderStatus) {
        const order = await this.orderModel.findById(orderId);

        if (!order) throw new NotFoundException('Order not found');

        if (order.riderId?.toString() !== riderId) {
            throw new BadRequestException('Not your order');
        }

        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            'pending': ['assigned', 'cancelled'],
            'assigned': ['picked_up', 'cancelled'],
            'picked_up': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': [],
        };

        if (!validTransitions[order.status]?.includes(status)) {
            throw new BadRequestException(`Invalid status transition from ${order.status} to ${status}`);
        }

        if (status === 'cancelled' && (order.status === 'assigned' || order.status === 'picked_up')) {
            order.status = 'pending';
            order.riderId = null;
        } else {
            order.status = status;
        }

        if (status === 'completed') {
            order.completedAt = new Date();
        }

        return order.save();
    }

    // ================= PROFILE UPDATE =================
    async updateProfile(riderId: string, dto: RiderProfileDto) {
        if (!Types.ObjectId.isValid(riderId)) {
            throw new BadRequestException('Invalid ID');
        }

        let profile = await this.riderProfileModel.findOne({
            rider: new Types.ObjectId(riderId),
        });

        if (!profile) {
            profile = new this.riderProfileModel({
                rider: new Types.ObjectId(riderId),
            });
        }

        Object.assign(profile, dto);

        return profile.save();
    }

    // ================= DELETE PROFILE =================
    async deleteProfile(riderId: string) {
        if (!Types.ObjectId.isValid(riderId)) {
            throw new BadRequestException('Invalid ID');
        }

        const profile = await this.riderProfileModel.findOne({
            rider: new Types.ObjectId(riderId),
        });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        await profile.deleteOne();

        return { message: 'Profile deleted' };
    }
}