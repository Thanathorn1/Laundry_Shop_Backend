import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
} from '@nestjs/common';

import { RiderService } from './rider.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RiderProfileDto } from './dto/rider-profile.dto';
import { OrderStatus } from '../../orders/schemas/order.schema';

@Controller('rider')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('rider', 'admin')
export class RiderController {
    constructor(private readonly riderService: RiderService) { }

    /* ================= PROFILE ================= */

    @Get('profile')
    @Roles('rider')
    getProfile(@Req() req: any) {
        return this.riderService.getProfile(req.user.userId);
    }

    @Get('list')
    @Roles('admin')
    getAllRiders() {
        return this.riderService.findAllRiders();
    }

    @Patch('profile')
    @Roles('rider')
    updateProfile(
        @Req() req: any,
        @Body() dto: RiderProfileDto,
    ) {
        return this.riderService.updateProfile(
            req.user.userId,
            dto,
        );
    }

    @Delete('profile')
    @Roles('rider')
    deleteMyProfile(@Req() req: any) {
        return this.riderService.deleteProfile(
            req.user.userId,
        );
    }

    /* ================= ORDER ================= */

    // ดูงานที่ยังไม่มีคนรับ
    @Get('available')
    @Roles('rider')
    getAvailableOrders() {
        return this.riderService.findAvailableOrders();
    }

    // ดูงานของตัวเอง
    @Get('my-tasks')
    @Roles('rider')
    getMyTasks(@Req() req: any) {
        return this.riderService.findRiderTasks(
            req.user.userId,
        );
    }

    // รับงาน
    @Patch('accept/:id')
    @Roles('rider')
    acceptOrder(
        @Param('id') orderId: string,
        @Req() req: any,
    ) {
        return this.riderService.acceptOrder(
            orderId,
            req.user.userId,
        );
    }

    // อัพเดตสถานะงาน
    @Patch('status/:id')
    @Roles('rider')
    updateStatus(
        @Param('id') orderId: string,
        @Body('status') status: OrderStatus,
        @Req() req: any,
    ) {
        return this.riderService.updateStatus(
            orderId,
            req.user.userId,
            status,
        );
    }
}