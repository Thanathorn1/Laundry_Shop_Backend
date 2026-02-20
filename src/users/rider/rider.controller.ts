import { Controller, Get, Patch, Post, Param, Body, UseGuards, Req, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { RiderService } from './rider.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RiderProfileDto } from './dto/rider-profile.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Delete } from '@nestjs/common';

@Controller('rider')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('rider', 'admin') // อนุญาตทั้ง Rider และ Admin ให้เข้าถึงเบื้องต้น
export class RiderController {
    constructor(private readonly riderService: RiderService) { }

    @Get('profile')
    getProfile(@Req() req: any) {
        const riderId = req.user.userId;
        return this.riderService.getProfile(riderId);
    }

    @Get('list')
    @Roles('admin') // เฉพาะ Admin เท่านั้นที่ดูรายชื่อ Rider ทั้งหมดได้
    getAllRiders() {
        return this.riderService.findAllRiders();
    }

    @Get('available')
    @Roles('rider', 'admin')
    getAvailableOrders() {
        return this.riderService.findAvailableOrders();
    }

    @Get('my-tasks')
    @Roles('rider', 'admin')
    getMyTasks(@Req() req: any) {
        const riderId = req.user.userId;
        return this.riderService.findRiderTasks(riderId);
    }

    @Get(':id')
    getRiderById(@Param('id') id: string) {
        return this.riderService.findRiderById(id);
    }

    @Patch('accept/:id')
    @Roles('rider')
    acceptOrder(@Param('id') orderId: string, @Req() req: any) {
        const riderId = req.user.userId;
        return this.riderService.acceptOrder(orderId, riderId);
    }

    @Patch('status/:id')
    @Roles('rider')
    updateStatus(
        @Param('id') orderId: string,
        @Body('status') status: string,
        @Req() req: any,
    ) {
        const riderId = req.user.userId;
        return this.riderService.updateStatus(orderId, riderId, status);
    }

    @Delete('profile')
    @Roles('rider')
    deleteMyProfile(@Req() req: any) {
        const riderId = req.user.userId;
        return this.riderService.deleteProfile(riderId);
    }

    @Delete('profile/:id')
    @Roles('rider', 'admin')
    deleteProfileById(@Param('id') id: string) {
        return this.riderService.deleteProfile(id);
    }

}
