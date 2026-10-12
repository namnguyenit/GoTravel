import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CarModule } from './car/car.module';
import { OperatorModule } from './operator/operator.module';
import { RouteModule } from './route/route.module';
import { TripModule } from './trip/trip.module';
import { AuthModule } from './auth/auth.module';
import { TransportModule } from './transport/transport.module';
import { StaffModule } from './staff/staff.module';
import { StopModule } from './stop/stop.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CarModule,
    OperatorModule,
    RouteModule,
    TripModule,
    TransportModule,
    StaffModule,
    StopModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
