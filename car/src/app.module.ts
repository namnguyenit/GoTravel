import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CarModule } from './car/car.module';
import { OperatorModule } from './operator/operator.module';
import { RouteModule } from './route/route.module';

@Module({
  imports: [PrismaModule, CarModule, OperatorModule, RouteModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
