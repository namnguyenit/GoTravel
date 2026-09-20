import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CarModule } from './car/car.module';
import { OperatorModule } from './operator/operator.module';
import { RouteModule } from './route/route.module';
import { TripModule } from './trip/trip.module';

@Module({
  imports: [PrismaModule, CarModule, OperatorModule, RouteModule, TripModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
