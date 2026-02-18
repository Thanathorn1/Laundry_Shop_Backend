import { NestFactory } from '@nestjs/core'; 

import { AppModule } from './app.module'; 

import { ValidationPipe } from '@nestjs/common'; 

import helmet from 'helmet'; 

async function bootstrap() { 

  const app = await NestFactory.create(AppModule); 

  app.enableCors(); 
  app.use(helmet());
  app.useGlobalPipes( 

    new ValidationPipe({ 

      whitelist: true, 

      forbidNonWhitelisted: false, 

      transform: true, 

    }), 

  ); 

  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`✅ Server running on http://localhost:${port}`); 

} 

bootstrap(); 