import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Address } from './schemas/address.schema';
import { OrderLocation } from './schemas/order-location.schema';
import { Shop } from './schemas/shop.schema';
import { User } from '../users/admin/schemas/user.schema';

type RoadRouteResult = {
  points: [number, number][];
  distanceKm: number | null;
  durationMin: number | null;
};

@Injectable()
export class MapService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<Address>,
    @InjectModel(OrderLocation.name)
    private orderLocationModel: Model<OrderLocation>,
    @InjectModel(Shop.name) private shopModel: Model<Shop>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  private migrationDone = false;
  private readonly osrmServers = [
    'https://router.project-osrm.org',
    'https://routing.openstreetmap.de/routed-car',
  ];
  private readonly valhallaServers = [
    'https://valhalla1.openstreetmap.de',
    'https://valhalla2.openstreetmap.de',
  ];
  private readonly roadRouteCacheTtlMs = 60_000;
  private readonly roadRouteCache = new Map<
    string,
    { expiresAt: number; data: RoadRouteResult }
  >();

  private roundCoord(value: number) {
    return Math.round(value * 100000) / 100000;
  }

  private roadRouteKey(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ) {
    return `${this.roundCoord(fromLat)},${this.roundCoord(fromLng)}->${this.roundCoord(toLat)},${this.roundCoord(toLng)}`;
  }

  /** Decode Valhalla's default encoded polyline (precision 6) to [lat, lng][] */
  private decodePolyline6(encoded: string): [number, number][] {
    const points: [number, number][] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b: number, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      points.push([lat / 1e6, lng / 1e6]);
    }
    return points;
  }

  /** Try Valhalla routing API (primary — reliably reachable) */
  private async tryValhallaServer(
    server: string,
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<RoadRouteResult | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${server}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [
            { lat: fromLat, lon: fromLng },
            { lat: toLat, lon: toLng },
          ],
          costing: 'auto',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) return null;

      const data = await response.json();
      const leg = data?.trip?.legs?.[0];
      if (!leg?.shape || typeof leg.shape !== 'string') return null;

      const points = this.decodePolyline6(leg.shape).filter(
        ([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng),
      );
      if (points.length < 2) return null;

      const summary = data?.trip?.summary;
      return {
        points,
        distanceKm: Number.isFinite(summary?.length) ? Number(summary.length) : null,
        durationMin: Number.isFinite(summary?.time) ? Number(summary.time) / 60 : null,
      };
    } catch {
      return null;
    }
  }

  /** Try OSRM routing API (fallback) */
  private async tryOsrmServer(
    server: string,
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<RoadRouteResult | null> {
    try {
      const url = `${server}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) return null;

      const data = await response.json();
      const route = Array.isArray(data?.routes) ? data.routes[0] : null;
      const coordinates = Array.isArray(route?.geometry?.coordinates)
        ? route.geometry.coordinates
        : [];

      const points: [number, number][] = coordinates
        .filter((coord: unknown) => Array.isArray(coord) && coord.length >= 2)
        .map((coord: unknown) => {
          const c = coord as [number, number];
          return [Number(c[1]), Number(c[0])] as [number, number];
        })
        .filter(
          (coord: [number, number]) =>
            Number.isFinite(coord[0]) && Number.isFinite(coord[1]),
        );

      if (points.length < 2) return null;

      return {
        points,
        distanceKm: Number.isFinite(route?.distance)
          ? Number(route.distance) / 1000
          : null,
        durationMin: Number.isFinite(route?.duration)
          ? Number(route.duration) / 60
          : null,
      };
    } catch {
      return null;
    }
  }

  async getRoadRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<RoadRouteResult> {
    const key = this.roadRouteKey(fromLat, fromLng, toLat, toLng);
    const now = Date.now();
    const cached = this.roadRouteCache.get(key);

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // Try Valhalla first (fast, reliable)
    for (const server of this.valhallaServers) {
      const result = await this.tryValhallaServer(server, fromLat, fromLng, toLat, toLng);
      if (result) {
        this.roadRouteCache.set(key, {
          expiresAt: now + this.roadRouteCacheTtlMs,
          data: result,
        });
        return result;
      }
    }

    // Fallback: OSRM
    for (const server of this.osrmServers) {
      const result = await this.tryOsrmServer(
        server,
        fromLat,
        fromLng,
        toLat,
        toLng,
      );
      if (result) {
        this.roadRouteCache.set(key, {
          expiresAt: now + this.roadRouteCacheTtlMs,
          data: result,
        });
        return result;
      }
    }

    if (cached) {
      return cached.data;
    }

    return {
      points: [],
      distanceKm: null,
      durationMin: null,
    };
  }

  private normalizeTotalWashingMachines(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 10;
    return Math.max(1, Math.floor(parsed));
  }

  private normalizeTotalDryingMachines(
    value: unknown,
    fallbackTotalWashing = 10,
  ): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return Math.max(1, Math.floor(fallbackTotalWashing));
    }
    return Math.max(1, Math.floor(parsed));
  }

  private normalizeMachineSizeConfig(
    configValue: unknown,
    fallbackTotal = 10,
  ): { s: number; m: number; l: number; total: number } {
    const fallback = this.normalizeTotalWashingMachines(fallbackTotal);

    if (!configValue || typeof configValue !== 'object') {
      return { s: fallback, m: 0, l: 0, total: fallback };
    }

    const raw = configValue as Record<string, unknown>;
    const s = Math.max(0, Math.floor(Number(raw.s) || 0));
    const m = Math.max(0, Math.floor(Number(raw.m) || 0));
    const l = Math.max(0, Math.floor(Number(raw.l) || 0));
    const total = s + m + l;

    if (total <= 0) {
      return { s: fallback, m: 0, l: 0, total: fallback };
    }

    return { s, m, l, total };
  }

  private async migrateLegacyShopsIfNeeded() {
    if (this.migrationDone) return;
    this.migrationDone = true;

    const shopCount = await this.shopModel.countDocuments();
    if (shopCount > 0) return;

    const legacyShops = await this.addressModel
      .find({ ownerType: 'shop' })
      .lean();
    if (!legacyShops.length) return;

    const docs = legacyShops
      .filter((item: any) => item.location?.coordinates?.length >= 2)
      .map((item: any) => ({
        shopName: item.shopName || item.label || 'Laundry Shop',
        label: item.label || item.shopName || 'Laundry Shop',
        phoneNumber: item.phoneNumber || '',
        photoImage: item.photoImage || '',
        ownerId: item.ownerId || 'legacy',
        totalWashingMachines: 10,
        totalDryingMachines: 10,
        machineSizeConfig: { s: 10, m: 0, l: 0 },
        approvalStatus: 'approved',
        approvedBy: null,
        approvedAt: null,
        location: item.location,
      }));

    if (docs.length) {
      await this.shopModel.insertMany(docs, { ordered: false });
    }

    // Remove legacy records so they don't re-migrate
    await this.addressModel.deleteMany({ ownerType: 'shop' });
  }

  private ensureShopUploadDir(): string {
    const uploadDir = path.join(process.cwd(), 'uploads', 'shop');
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

  private persistShopPhoto(photoImage?: string): string {
    if (!photoImage || typeof photoImage !== 'string') return '';

    if (
      photoImage.startsWith('/uploads/shop/') ||
      photoImage.startsWith('http://') ||
      photoImage.startsWith('https://')
    ) {
      return photoImage;
    }

    const match = photoImage.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
    );
    if (!match) {
      return photoImage;
    }

    const mimeType = match[1];
    const payload = match[2];
    const ext = this.dataUrlToFileExt(mimeType);
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const uploadDir = this.ensureShopUploadDir();
    const absolutePath = path.join(uploadDir, fileName);

    fs.writeFileSync(absolutePath, Buffer.from(payload, 'base64'));

    return `/uploads/shop/${fileName}`;
  }

  private deleteShopPhotoByPath(relativePath?: string) {
    if (!relativePath || !relativePath.startsWith('/uploads/shop/')) return;

    const fileName = path.basename(relativePath);
    const absolutePath = path.join(process.cwd(), 'uploads', 'shop', fileName);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch {
        // ignore cleanup error
      }
    }
  }

  private toLngLat(input: any): [number, number] | null {
    if (!input) return null;
    if (input.type === 'Point' && Array.isArray(input.coordinates))
      return [input.coordinates[0], input.coordinates[1]];
    if ('lat' in input && 'lng' in input) return [input.lng, input.lat];
    if (Array.isArray(input) && input.length >= 2) return [input[0], input[1]];
    return null;
  }

  // Haversine distance in kilometers
  distanceKm(from: any, to: any): number | null {
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
    const c =
      2 *
      Math.asin(
        Math.sqrt(
          sinDLat * sinDLat +
            Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
        ),
      );
    return Math.round(R * c * 1000) / 1000; // meters->km rounded to 3 decimals
  }

  // Approx duration in minutes assuming average speed (km/h)
  durationMin(distanceKm: number | null, speedKmh = 30): number | null {
    if (distanceKm == null) return null;
    const hours = distanceKm / speedKmh;
    return Math.round(hours * 60);
  }

  // Simple fee formula: base + per-km
  deliveryFee(distanceKm: number | null): number | null {
    if (distanceKm == null) return null;
    const base = 20; // base THB
    const perKm = 5; // per km THB
    return Math.max(Math.round((base + distanceKm * perKm) * 100) / 100, base);
  }

  async createAddress(payload: any) {
    const loc = this.normalizeLocation(payload.location);
    const doc = new this.addressModel({
      ownerType: payload.ownerType,
      ownerId: payload.ownerId,
      label: payload.label,
      location: loc,
    });
    return doc.save();
  }

  async createShopPin(ownerId: string, payload: any, creatorRole: string) {
    const location = this.normalizeLocation(payload.location);
    const shopName = payload.shopName || payload.label || 'Laundry Shop';
    const savedPhoto = this.persistShopPhoto(payload.photoImage || '');
    const isAdminCreator = creatorRole === 'admin';
    const machineConfig = this.normalizeMachineSizeConfig(
      payload.machineSizeConfig,
      payload.totalWashingMachines,
    );
    const totalDryingMachines = this.normalizeTotalDryingMachines(
      payload.totalDryingMachines,
      machineConfig.total,
    );

    const doc = new this.shopModel({
      ownerId,
      label: payload.label || shopName,
      shopName,
      phoneNumber: payload.phoneNumber || '',
      photoImage: savedPhoto,
      totalWashingMachines: machineConfig.total,
      totalDryingMachines,
      machineSizeConfig: {
        s: machineConfig.s,
        m: machineConfig.m,
        l: machineConfig.l,
      },
      approvalStatus: isAdminCreator ? 'approved' : 'pending',
      approvedBy: isAdminCreator ? ownerId : null,
      approvedAt: isAdminCreator ? new Date() : null,
      location,
    });

    return doc.save();
  }

  async listShopPins() {
    await this.migrateLegacyShopsIfNeeded();

    return this.shopModel.find().sort({ createdAt: -1 }).lean();
  }

  async updateShopPin(shopId: string, payload: any, editorRole?: string) {
    const existing = await this.shopModel.findOne({ _id: shopId }).lean();
    const legacyExisting = !existing
      ? await this.addressModel
          .findOne({ _id: shopId, ownerType: 'shop' })
          .lean()
      : null;
    const target = existing || legacyExisting;
    if (!target) return null;

    const updateData: any = {};

    if (payload.shopName !== undefined) updateData.shopName = payload.shopName;
    if (payload.label !== undefined) updateData.label = payload.label;
    if (payload.phoneNumber !== undefined)
      updateData.phoneNumber = payload.phoneNumber;
    if (
      payload.totalWashingMachines !== undefined ||
      payload.machineSizeConfig !== undefined ||
      payload.totalDryingMachines !== undefined
    ) {
      const existingTotal = Number((target as any)?.totalWashingMachines) || 10;
      const fallbackTotal =
        payload.totalWashingMachines !== undefined
          ? payload.totalWashingMachines
          : existingTotal;

      const normalized = this.normalizeMachineSizeConfig(
        payload.machineSizeConfig,
        fallbackTotal,
      );

      updateData.totalWashingMachines = normalized.total;
      updateData.machineSizeConfig = {
        s: normalized.s,
        m: normalized.m,
        l: normalized.l,
      };

      const existingDrying = Number((target as any)?.totalDryingMachines);
      const dryingFallback = Number.isFinite(existingDrying)
        ? existingDrying
        : normalized.total;
      updateData.totalDryingMachines = this.normalizeTotalDryingMachines(
        payload.totalDryingMachines,
        dryingFallback,
      );
    }
    if (payload.photoImage !== undefined) {
      const nextPhoto = this.persistShopPhoto(payload.photoImage);
      updateData.photoImage = nextPhoto;
      if (target.photoImage && target.photoImage !== nextPhoto) {
        this.deleteShopPhotoByPath(target.photoImage);
      }
    }
    if (payload.location !== undefined)
      updateData.location = this.normalizeLocation(payload.location);

    // If editor is employee, reset approval status to pending
    if (editorRole === 'employee') {
      updateData.approvalStatus = 'pending';
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }

    if (existing) {
      return this.shopModel
        .findOneAndUpdate({ _id: shopId }, { $set: updateData }, { new: true })
        .lean();
    }

    return this.addressModel
      .findOneAndUpdate(
        { _id: shopId, ownerType: 'shop' },
        { $set: updateData },
        { new: true },
      )
      .lean();
  }

  async deleteShopPin(shopId: string) {
    const deletedFromShops = await this.shopModel
      .findOneAndDelete({ _id: shopId })
      .lean();

    const deletedFromAddresses = !deletedFromShops
      ? await this.addressModel
          .findOneAndDelete({ _id: shopId, ownerType: 'shop' })
          .lean()
      : null;

    const deleted = deletedFromShops || deletedFromAddresses;

    if (deleted?.photoImage) {
      this.deleteShopPhotoByPath(deleted.photoImage);
    }

    return deleted;
  }

  async approveShopPin(shopId: string, approverUserId: string) {
    return this.shopModel
      .findOneAndUpdate(
        { _id: shopId },
        {
          $set: {
            approvalStatus: 'approved',
            approvedBy: approverUserId,
            approvedAt: new Date(),
          },
        },
        { new: true },
      )
      .lean();
  }

  async listAddresses(filter = {}) {
    return this.addressModel.find(filter).lean();
  }

  async listNearbyShops(lat: number, lng: number, maxDistanceKm = 5) {
    await this.migrateLegacyShopsIfNeeded();
    const maxDistanceMeters = Math.max(0.2, maxDistanceKm) * 1000;

    const shops = await this.shopModel
      .find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: maxDistanceMeters,
          },
        },
      })
      .lean();

    return shops.map((shop: any) => ({
      ...shop,
      distanceKm: this.distanceKm({ lat, lng }, shop.location),
    }));
  }

  normalizeLocation(input: any) {
    if (!input) return null;
    if (input.type === 'Point' && Array.isArray(input.coordinates))
      return { type: 'Point', coordinates: input.coordinates };
    if ('lat' in input && 'lng' in input)
      return { type: 'Point', coordinates: [input.lng, input.lat] };
    if (Array.isArray(input) && input.length >= 2)
      return { type: 'Point', coordinates: [input[0], input[1]] };
    return null;
  }

  async snapshotOrderLocation(
    orderId: string,
    type: string,
    loc: any,
    extra?: any,
  ) {
    const location = this.normalizeLocation(loc);
    const distanceKm = extra?.distanceKm ?? null;
    const durationMin = extra?.durationMin ?? null;
    const deliveryFee = extra?.deliveryFee ?? null;
    const doc = new this.orderLocationModel({
      orderId,
      type,
      location,
      distanceKm,
      durationMin,
      deliveryFee,
    });
    return doc.save();
  }

  async updateRiderLocation(riderId: string, loc: any) {
    const location = this.normalizeLocation(loc);
    if (!location) return null;

    const rider = await this.userModel
      .findOneAndUpdate(
        { _id: riderId, role: 'rider' },
        { $set: { location } },
        { new: true },
      )
      .select('_id location updatedAt')
      .lean();

    if (!rider) return null;

    return {
      riderId: String((rider as any)._id),
      location: (rider as any).location,
      updatedAt: (rider as any).updatedAt,
    };
  }

  async getRiderLocation(riderId: string) {
    const rider = await this.userModel
      .findOne({ _id: riderId, role: 'rider' })
      .select('_id location updatedAt')
      .lean();

    if (!rider) return null;

    return {
      riderId: String((rider as any)._id),
      location: (rider as any).location,
      updatedAt: (rider as any).updatedAt,
    };
  }
}
