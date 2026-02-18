import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MapService } from './map.service';

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
}
