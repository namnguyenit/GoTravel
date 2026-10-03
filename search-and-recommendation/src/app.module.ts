import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './cache/cache.module';
import { envValidationSchema } from './config/env.config';
import { DatabaseModule } from './database/database.module';
import { BehaviorModule } from './behavior/behavior.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { SearchModule } from './search/search.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-internal-service-token"]',
            'req.headers["x-internal-token"]',
            'req.headers["x-csrf-token"]',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        },
      },
    }),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
    DatabaseModule,
    CacheModule,
    InventoryModule,
    HealthModule,
    SearchModule,
    RecommendationModule,
    BehaviorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
