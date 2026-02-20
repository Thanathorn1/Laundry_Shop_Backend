import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { MapService } from './map.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';

@Controller()
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Post('map/distance')
  distance(@Body() body: any) {
    const { from, to } = body;
    const distanceKm = this.mapService.distanceKm(from, to);
    const durationMin = this.mapService.durationMin(distanceKm);
    return { distanceKm, durationMin };
  }

  @Post('map/delivery-fee')
  deliveryFee(@Body() body: any) {
    let distance = body.distanceKm;
    if (!distance && body.from && body.to) distance = this.mapService.distanceKm(body.from, body.to);
    const fee = this.mapService.deliveryFee(distance);
    return { fee, distanceKm: distance };
  }

  @Post('addresses')
  async createAddress(@Body() body: any) {
    return this.mapService.createAddress(body);
  }

  @Get('addresses')
  async listAddresses(@Query() query: any) {
    const filter: any = {};
    if (query.ownerType) filter.ownerType = query.ownerType;
    if (query.ownerId) filter.ownerId = query.ownerId;
    return this.mapService.listAddresses(filter);
  }

  @Post('rider/location')
  async updateRider(@Body() body: any) {
    return this.mapService.updateRiderLocation(body.riderId, body.location);
  }

  @Get('rider/location/:riderId')
  async getRider(@Param('riderId') riderId: string) {
    return this.mapService.getRiderLocation(riderId);
  }

  @UseGuards(AccessTokenGuard)
  @Post('map/shops')
  async createShop(@Request() req: any, @Body() body: any) {
    if (req?.user?.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }

    const location = body?.location;
    if (!location) {
      throw new BadRequestException('location is required');
    }

    const ownerId = req?.user?.userId || req?.user?.sub || req?.user?.id;
    return this.mapService.createShopPin(ownerId, body);
  }

  @UseGuards(AccessTokenGuard)
  @Get('map/shops')
  async listShops(@Request() req: any) {
    if (req?.user?.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }
    return this.mapService.listShopPins();
  }

  @UseGuards(AccessTokenGuard)
  @Put('map/shops/:shopId')
  async updateShop(@Request() req: any, @Param('shopId') shopId: string, @Body() body: any) {
    if (req?.user?.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }

    const updated = await this.mapService.updateShopPin(shopId, body);
    if (!updated) throw new NotFoundException('Shop not found');
    return updated;
  }

  @UseGuards(AccessTokenGuard)
  @Delete('map/shops/:shopId')
  async deleteShop(@Request() req: any, @Param('shopId') shopId: string) {
    if (req?.user?.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }

    const deleted = await this.mapService.deleteShopPin(shopId);
    if (!deleted) throw new NotFoundException('Shop not found');
    return { success: true };
  }

  @UseGuards(AccessTokenGuard)
  @Get('map/shops/nearby')
  async nearbyShops(@Query() query: any) {
    const lat = Number(query.lat);
    const lng = Number(query.lng);
    const maxDistanceKm = query.maxDistanceKm !== undefined ? Number(query.maxDistanceKm) : 5;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException('lat and lng query are required numbers');
    }

    return this.mapService.listNearbyShops(lat, lng, Number.isNaN(maxDistanceKm) ? 5 : maxDistanceKm);
  }
}
