import { Controller, Get, Patch, Post, Param, Body, UseGuards, Req, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { RiderService } from './rider.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RiderProfileDto } from './dto/rider-profile.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Delete, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users.service';

@Controller('rider')
@UseGuards(AccessTokenGuard)
export class RiderController {
    constructor(
        private readonly riderService: RiderService,
        private readonly usersService: UsersService,
    ) { }

    private async ensureRole(req: any, allowedRoles: Array<'user' | 'rider' | 'admin' | 'employee'>) {
        const userId = req?.user?.userId || req?.user?.sub || req?.user?.id;
        if (!userId) throw new ForbiddenException('Unauthorized');

        const user = await this.usersService.findUserById(userId);
        if (!user || !allowedRoles.includes(user.role as any)) {
            throw new ForbiddenException('ไม่อนุญาตให้เข้าถึงข้อมูลส่วนนี้');
        }

        return userId;
    }

    @Get('profile')
    async getProfile(@Req() req: any) {
        const riderId = await this.ensureRole(req, ['rider', 'admin']);
        return this.riderService.getProfile(riderId);
    }

    @Get('list')
    async getAllRiders(@Req() req: any) {
        await this.ensureRole(req, ['admin']);
        return this.riderService.findAllRiders();
    }

    @Get('available')
    async getAvailableOrders(@Req() req: any) {
        await this.ensureRole(req, ['rider', 'admin']);
        return this.riderService.findAvailableOrders();
    }

    @Get('my-tasks')
    async getMyTasks(@Req() req: any) {
        const riderId = await this.ensureRole(req, ['rider', 'admin']);
        return this.riderService.findRiderTasks(riderId);
    }

    @Get(':id')
    async getRiderById(@Req() req: any, @Param('id') id: string) {
        await this.ensureRole(req, ['rider', 'admin']);
        return this.riderService.findRiderById(id);
    }

    @Patch('accept/:id')
    async acceptOrder(@Param('id') orderId: string, @Req() req: any) {
        const riderId = await this.ensureRole(req, ['rider']);
        return this.riderService.acceptOrder(orderId, riderId);
    }

    @Patch('status/:id')
    async updateStatus(
        @Param('id') orderId: string,
        @Body('status') status: string,
        @Req() req: any,
    ) {
        const riderId = await this.ensureRole(req, ['rider']);
        return this.riderService.updateStatus(orderId, riderId, status);
    }

    @Patch('handover/:id')
    async handoverToShop(
        @Param('id') orderId: string,
        @Body('shopId') shopId: string,
        @Req() req: any,
    ) {
        const riderId = await this.ensureRole(req, ['rider']);
        return this.usersService.riderHandoverToShop(orderId, riderId, shopId);
    }

    @Patch('return-delivery/:id')
    async startReturnDelivery(@Param('id') orderId: string, @Req() req: any) {
        const riderId = await this.ensureRole(req, ['rider']);
        return this.usersService.riderStartDeliveryBack(orderId, riderId);
    }

    @Delete('profile')
    async deleteMyProfile(@Req() req: any) {
        const riderId = await this.ensureRole(req, ['rider']);
        return this.riderService.deleteProfile(riderId);
    }

    @Delete('profile/:id')
    async deleteProfileById(@Req() req: any, @Param('id') id: string) {
        await this.ensureRole(req, ['rider', 'admin']);
        return this.riderService.deleteProfile(id);
    }

}
