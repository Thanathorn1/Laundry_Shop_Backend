import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { PassportModule } from '@nestjs/passport';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';

import { AuthController } from './auth.controller';

import { UsersCoreModule } from '../users/users-core.module';

import { JwtStrategy } from './strategies/jwt.strategy';

import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [UsersCoreModule, PassportModule, JwtModule.register({})],

  controllers: [AuthController],

  providers: [AuthService, JwtStrategy, RefreshStrategy],
})
export class AuthModule {}
