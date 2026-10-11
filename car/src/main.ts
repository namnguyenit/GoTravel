import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap() {
  if (process.env.GOCAR_ENABLED !== 'true') {
    throw new Error('GoCar backend is disabled until migration and integration gates pass');
  }
  if (!process.env.DATABASE_URL || !process.env.INTERNAL_SERVICE_TOKEN ||
      !process.env.TICKET_SIGNING_KEY || process.env.TICKET_SIGNING_KEY.length < 32) {
    throw new Error('GoCar backend is missing database, internal auth or ticket signing configuration');
  }
  const app = await NestFactory.create(AppModule);

  // Kích hoạt ValidationPipe toàn cục (Global Validation Pipe)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(env.port, env.bindHost);
}
bootstrap();
