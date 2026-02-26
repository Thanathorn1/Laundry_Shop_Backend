import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../customer/schemas/order.schema';
import {
  RiderProfile,
  RiderProfileDocument,
} from './schemas/rider-profile.schema';
import { RiderProfileDto } from './dto/rider-profile.dto';
import * as fs from 'fs';
import * as path from 'path';
import { OrderGateway } from '../../realtime/order.gateway';

@Injectable()
export class RiderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(RiderProfile.name)
    private riderProfileModel: Model<RiderProfileDocument>,
    private configService: ConfigService,
    private readonly orderGateway: OrderGateway,
  ) {}

  public deleteFile(relativePath: string) {
    if (!relativePath) return;

    const fileName = path.basename(relativePath); // ป้องกัน ../../
    const absolutePath = path.join(process.cwd(), 'uploads', 'rider', fileName);

    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
        console.log(`Deleted: ${absolutePath}`);
      } catch (err) {
        console.error(`Delete failed:`, err);
      }
    }
  }

  private formatProfileUrls(profile: RiderProfileDocument) {
    try {
      if (!profile) return null;
      const baseUrl =
        this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const p = profile.toObject();

      if (p.riderImageUrl && !p.riderImageUrl.startsWith('http')) {
        p.riderImageUrl = `${baseUrl}${p.riderImageUrl}`;
      }
      if (p.vehicleImageUrl && !p.vehicleImageUrl.startsWith('http')) {
        p.vehicleImageUrl = `${baseUrl}${p.vehicleImageUrl}`;
      }
      return p;
    } catch (error) {
      console.error('Error in formatProfileUrls:', error);
      return profile; // Return original if formatting fails
    }
  }

  async getProfile(riderId: string) {
    if (!riderId || !Types.ObjectId.isValid(riderId)) {
      throw new BadRequestException(
        `ID ไม่ถูกต้อง หรือยังไม่ได้เข้าสู่ระบบ: ${riderId}`,
      );
    }
    const profile = await this.riderProfileModel
      .findOne({ rider: new Types.ObjectId(riderId) })
      .populate('rider', 'email role')
      .exec();
    if (!profile) {
      throw new NotFoundException('โปรไฟล์ Rider ยังไม่ได้ถูกสร้างตัวตน');
    }
    return this.formatProfileUrls(profile);
  }

  async findRiderById(riderId: string) {
    if (!Types.ObjectId.isValid(riderId)) {
      throw new BadRequestException(`ID ไม่ถูกต้อง: ${riderId}`);
    }
    const profile = await this.riderProfileModel
      .findOne({ rider: new Types.ObjectId(riderId) })
      .populate('rider', 'email role')
      .exec();
    if (!profile) {
      throw new NotFoundException('ไม่พบข้อมูล Rider');
    }
    return this.formatProfileUrls(profile);
  }

  async findAllRiders() {
    const profiles = await this.riderProfileModel
      .find()
      .populate('rider', 'email role')
      .exec();
    return profiles.map((p) => this.formatProfileUrls(p));
  }

  async updateProfile(
    id: string,
    dto: RiderProfileDto,
    riderImageUrl?: string,
    vehicleImageUrl?: string,
  ): Promise<RiderProfileDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `ID ที่ส่งมาไม่ถูกต้อง (Invalid ObjectId): ${id}`,
      );
    }

    const objectId = new Types.ObjectId(id);

    // 1. ค้นหาโปรไฟล์ที่ "เป็นของ" Rider คนนี้ (จาก User ID)
    // หรือค้นหาตรงๆ จาก Profile ID ที่ส่งมา
    let profile = await this.riderProfileModel.findOne({
      $or: [{ rider: objectId }, { _id: objectId }],
    });

    // 2. ถ้ายังไม่มีโปรไฟล์เลย ให้สร้างใหม่
    if (!profile) {
      // เช็คก่อนว่า Rider คนนี้แอบมี Profile อื่นอยู่แล้วหรือเปล่า (กรณี id ที่ส่งมาคือ Profile ID)
      // แต่ปกติ logic ด้านบนจะครอบคลุมแล้ว
      profile = new this.riderProfileModel({
        rider: objectId, // สมมติว่า id คือ Rider ID
      });
    }

    // 3. จัดการรูปภาพ (ลบรูปเก่าถ้ามีการเปลี่ยน)
    if (riderImageUrl) {
      if (profile.riderImageUrl) this.deleteFile(profile.riderImageUrl);
      profile.riderImageUrl = riderImageUrl;
    }

    if (vehicleImageUrl) {
      if (profile.vehicleImageUrl) {
        this.deleteFile(profile.vehicleImageUrl);
      }
      profile.vehicleImageUrl = vehicleImageUrl;
    }

    // update field อื่นๆ ที่ส่งมาใน DTO
    Object.assign(profile, dto);

    return profile.save();
  }

  async purgeOrphanedFiles(): Promise<{ deletedCount: number }> {
    const uploadDir = path.join(process.cwd(), 'uploads', 'rider');
    if (!fs.existsSync(uploadDir)) return { deletedCount: 0 };

    const files = fs.readdirSync(uploadDir);
    const profiles = await this.riderProfileModel
      .find({}, 'riderImageUrl vehicleImageUrl')
      .exec();

    // ดึงรายชื่อไฟล์ทั้งหมดที่ยังใช้อยู่ใน DB
    const usedFiles = new Set<string>();
    profiles.forEach((p) => {
      if (p.riderImageUrl) usedFiles.add(path.basename(p.riderImageUrl));
      if (p.vehicleImageUrl) usedFiles.add(path.basename(p.vehicleImageUrl));
    });

    let deletedCount = 0;
    files.forEach((file) => {
      if (!usedFiles.has(file)) {
        try {
          fs.unlinkSync(path.join(uploadDir, file));
          deletedCount++;
        } catch (err) {
          console.error(`Failed to purge file: ${file}`, err);
        }
      }
    });

    return { deletedCount };
  }

  async findAvailableOrders(): Promise<OrderDocument[]> {
    return this.orderModel.find({ status: 'pending', riderId: null }).exec();
  }

  async findRiderTasks(riderId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ riderId: new Types.ObjectId(riderId) })
      .exec();
  }

  async acceptOrder(orderId: string, riderId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== 'pending' || order.riderId) {
      throw new BadRequestException('Order is no longer available');
    }

    order.riderId = new Types.ObjectId(riderId) as any;
    order.status = 'assigned';
    const saved = await order.save();
    this.orderGateway.emitOrderUpdate(saved);
    return saved;
  }

  async updateStatus(
    orderId: string,
    riderId: string,
    status: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (String(order.riderId || '') !== riderId) {
      throw new BadRequestException('You are not assigned to this order');
    }

    const validTransitions = {
      assigned: ['picked_up', 'cancelled'],
      out_for_delivery: ['completed'],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${status}`,
      );
    }

    order.status = status as any;
    if (status === 'completed') {
      (order as any).completedAt = new Date();
    }
    const saved = await order.save();
    this.orderGateway.emitOrderUpdate(saved);
    return saved;
  }

  async deleteRiderImage(riderId: string) {
    const profile = await this.riderProfileModel.findOne({ rider: riderId });

    if (!profile) throw new NotFoundException();

    if (profile.riderImageUrl) {
      this.deleteFile(profile.riderImageUrl);
      profile.riderImageUrl = '';
      await profile.save();
    }

    return { message: 'Image removed' };
  }

  async deleteProfile(id: string) {
    const isObjectId = Types.ObjectId.isValid(id);

    // ค้นหาเผื่อไว้ทั้ง 2 แบบ (Rider ID หรือ Profile ID)
    const profile = await this.riderProfileModel.findOne({
      $or: [
        { rider: isObjectId ? new Types.ObjectId(id) : null },
        { _id: isObjectId ? new Types.ObjectId(id) : null },
      ],
    });

    if (!profile) {
      throw new NotFoundException(
        `ไม่พบโปรไฟล์ที่มี ID: ${id} (ทั้งในฐานะ Rider ID และ Profile ID)`,
      );
    }

    // ลบไฟล์รูปภาพก่อนลบ Document
    if (profile.riderImageUrl) this.deleteFile(profile.riderImageUrl);
    if (profile.vehicleImageUrl) this.deleteFile(profile.vehicleImageUrl);

    await profile.deleteOne();

    return { message: 'ลบโปรไฟล์และไฟล์ภาพเรียบร้อยแล้ว' };
  }
}
