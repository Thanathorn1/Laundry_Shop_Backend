import { Module } from '@nestjs/common'; 



import { ConfigModule, ConfigService } from '@nestjs/config'; 

import { MongooseModule } from '@nestjs/mongoose'; 
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MapModule } from './map/map.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; 

import { APP_GUARD } from '@nestjs/core'; 
 

@Module({ 

  imports: [ConfigModule.forRoot({ 

    isGlobal: true, 

  }),
    // ตั้งค่า rate limiting โดยใช้ ThrottlerModule  

  ThrottlerModule.forRoot([ 

    { 

      ttl: 60_000,  // 1 minute 

      limit: 100,   // 100 requests per minute 

    }, 

  ]), 
  MongooseModule.forRootAsync({ 

    imports: [ConfigModule], 

    inject: [ConfigService], 

    useFactory: (configService: ConfigService) => ({ 

      uri: configService.get<string>('MONGO_URI'), 

    }), 

  }), UsersModule, AuthModule, MapModule], 



  

  // *** สำหรับการตั้งค่า global guard กรณีกันโดนยิง API รัว ๆ ทั้งระบบ ThrottlerGuard *** 

  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }], 

}) 

export class AppModule { } 