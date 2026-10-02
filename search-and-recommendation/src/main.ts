import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 8086;
  const host = configService.get<string>('SERVICE_BIND_HOST') || '127.0.0.1';
  
  // enable CORS
  app.enableCors();
  
  await app.listen(port, host);
  logger.log(`Search & Recommendation Service is running on ${host}:${port}`);
}
bootstrap();
