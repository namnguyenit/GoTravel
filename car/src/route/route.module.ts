import { Module } from '@nestjs/common';
import { RouteController } from './presentation/controller/route.controller';
import { CreateRouteUseCase } from './application/usecase/create-route.usecase';
import { GetRoutesUseCase } from './application/usecase/get-routes.usecase';
import { UpdateRouteStatusUseCase } from './application/usecase/update-route-status.usecase';
import { PrismaRouteRepository } from './infrastructure/repository/prisma-route.repository';

@Module({
  controllers: [RouteController],
  providers: [
    {
      provide: 'IRouteRepository',
      useClass: PrismaRouteRepository,
    },
    {
      provide: 'ICreateRouteUseCase',
      useClass: CreateRouteUseCase,
    },
    {
      provide: 'IGetRoutesUseCase',
      useClass: GetRoutesUseCase,
    },
    {
      provide: 'IUpdateRouteStatusUseCase',
      useClass: UpdateRouteStatusUseCase,
    },
  ],
  exports: [
    'IRouteRepository',
    'ICreateRouteUseCase',
    'IGetRoutesUseCase',
    'IUpdateRouteStatusUseCase',
  ],
})
export class RouteModule {}
