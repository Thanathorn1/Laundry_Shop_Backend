import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';

import helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configuredOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://localhost:3001',
    ...configuredOrigins,
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
  });
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,

      forbidNonWhitelisted: false,

      transform: true,
    }),
  );

  app.setGlobalPrefix('api');
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`✅ Server running on http://localhost:${port}`);
}

bootstrap();
