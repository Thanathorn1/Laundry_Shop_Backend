import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminService } from './admin.service';
import { UsersCoreModule } from '../users-core.module';

@Module({
  imports: [UsersCoreModule],
  controllers: [AdminUsersController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
