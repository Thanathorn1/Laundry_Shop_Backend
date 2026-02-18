import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address } from './schemas/address.schema';
import { OrderLocation } from './schemas/order-location.schema';
import { RiderLocation } from './schemas/rider-location.schema';

@Injectable()
export class MapService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<Address>,
    @InjectModel(OrderLocation.name) private orderLocationModel: Model<OrderLocation>,
    @InjectModel(RiderLocation.name) private riderLocationModel: Model<RiderLocation>,
  ) {}

  private toLngLat(input: any): [number, number] {
    if (!input) return null;
    if (input.type === 'Point' && Array.isArray(input.coordinates)) return [input.coordinates[0], input.coordinates[1]];
    if ('lat' in input && 'lng' in input) return [input.lng, input.lat];
    if (Array.isArray(input) && input.length >= 2) return [input[0], input[1]];
    return null;
  }

  // Haversine distance in kilometers
  distanceKm(from: any, to: any): number {
    const a = this.toLngLat(from);
    const b = this.toLngLat(to);
    if (!a || !b) return null;
    const R = 6371; // km
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const c = 2 * Math.asin(Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon));
    return Math.round(R * c * 1000) / 1000; // meters->km rounded to 3 decimals
  }

  // Approx duration in minutes assuming average speed (km/h)
  durationMin(distanceKm: number, speedKmh = 30): number {
    if (distanceKm == null) return null;
    const hours = distanceKm / speedKmh;
    return Math.round(hours * 60);
  }

  // Simple fee formula: base + per-km
  deliveryFee(distanceKm: number): number {
    if (distanceKm == null) return null;
    const base = 20; // base THB
    const perKm = 5; // per km THB
    return Math.max(Math.round((base + distanceKm * perKm) * 100) / 100, base);
  }

  async createAddress(payload: any) {
    const loc = this.normalizeLocation(payload.location);
    const doc = new this.addressModel({ ownerType: payload.ownerType, ownerId: payload.ownerId, label: payload.label, location: loc });
    return doc.save();
  }

  async listAddresses(filter = {}) {
    return this.addressModel.find(filter).lean();
  }

  normalizeLocation(input: any) {
    if (!input) return null;
    if (input.type === 'Point' && Array.isArray(input.coordinates)) return { type: 'Point', coordinates: input.coordinates };
    if ('lat' in input && 'lng' in input) return { type: 'Point', coordinates: [input.lng, input.lat] };
    if (Array.isArray(input) && input.length >= 2) return { type: 'Point', coordinates: [input[0], input[1]] };
    return null;
  }

  async snapshotOrderLocation(orderId: string, type: string, loc: any, extra?: any) {
    const location = this.normalizeLocation(loc);
    const distanceKm = extra?.distanceKm ?? null;
    const durationMin = extra?.durationMin ?? null;
    const deliveryFee = extra?.deliveryFee ?? null;
    const doc = new this.orderLocationModel({ orderId, type, location, distanceKm, durationMin, deliveryFee });
    return doc.save();
  }

  async updateRiderLocation(riderId: string, loc: any) {
    const location = this.normalizeLocation(loc);
    const now = new Date();
    return this.riderLocationModel.findOneAndUpdate(
      { riderId },
      { riderId, location, updatedAt: now },
      { upsert: true, new: true },
    );
  }

  async getRiderLocation(riderId: string) {
    return this.riderLocationModel.findOne({ riderId }).lean();
  }
}
