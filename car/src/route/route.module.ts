import { PrismaUpdateRouteManagement } from './infrastructure/repository/prisma-update-route.management';
import { Module } from '@nestjs/common';
import { RouteController } from './presentation/controller/route.controller';
import { CreateRouteUseCase } from './application/usecase/create-route.usecase';
import { UpdateRouteUseCase } from './application/usecase/update-route.usecase';
import { DeleteRouteUseCase } from './application/usecase/delete-route.usecase';
import { GetRoutesUseCase } from './application/usecase/get-routes.usecase';
import { UpdateRouteStatusUseCase } from './application/usecase/update-route-status.usecase';
import { GetRouteLocationsUseCase } from './application/usecase/get-route-locations.usecase';
import { GetRouteDetailUseCase } from './application/usecase/get-route-detail.usecase';
import { PrismaRouteRepository } from './infrastructure/repository/prisma-route.repository';

@Module({
  controllers: [RouteController],
  providers: [
    GetRouteDetailUseCase,
    { provide: 'RouteManagementPort', useClass: PrismaUpdateRouteManagement },
    {
      provide: 'IRouteRepository',
      useClass: PrismaRouteRepository,
    },
    {
      provide: 'ICreateRouteUseCase',
      useClass: CreateRouteUseCase,
    },
    {
      provide: 'IUpdateRouteUseCase',
      useClass: UpdateRouteUseCase,
    },
    {
      provide: 'IDeleteRouteUseCase',
      useClass: DeleteRouteUseCase,
    },
    {
      provide: 'IGetRoutesUseCase',
      useClass: GetRoutesUseCase,
    },
    {
      provide: 'IUpdateRouteStatusUseCase',
      useClass: UpdateRouteStatusUseCase,
    },
    {
      provide: 'IGetRouteLocationsUseCase',
      useClass: GetRouteLocationsUseCase,
    },
  ],
  exports: [
    'IRouteRepository',
    'ICreateRouteUseCase',
    'IUpdateRouteUseCase',
    'IDeleteRouteUseCase',
    'IGetRoutesUseCase',
    'IUpdateRouteStatusUseCase',
    'IGetRouteLocationsUseCase',
  ],
})
export class RouteModule {}
