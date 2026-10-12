import { Module } from '@nestjs/common';
import { CarController } from './presentation/controller/car.controller';
import { AddCarUseCase } from './application/usecase/add-car.usecase';
import { GetCarsUseCase } from './application/usecase/get-cars.usecase';
import { GetCarDetailUseCase } from './application/usecase/get-car-detail.usecase';
import { UpdateCarUseCase } from './application/usecase/update-car.usecase';
import { UpdateCarStatusUseCase } from './application/usecase/update-car-status.usecase';
import { PrismaCarRepository } from './infrastructure/repository/prisma-car.repository';

@Module({
  controllers: [CarController],
  providers: [
    {
      provide: 'ICarRepository',
      useClass: PrismaCarRepository,
    },
    {
      provide: 'IAddCarUseCase',
      useClass: AddCarUseCase,
    },
    {
      provide: 'IGetCarsUseCase',
      useClass: GetCarsUseCase,
    },
    {
      provide: 'IGetCarDetailUseCase',
      useClass: GetCarDetailUseCase,
    },
    {
      provide: 'IUpdateCarUseCase',
      useClass: UpdateCarUseCase,
    },
    {
      provide: 'IUpdateCarStatusUseCase',
      useClass: UpdateCarStatusUseCase,
    },
  ],
  exports: [
    'ICarRepository',
    'IAddCarUseCase',
    'IGetCarsUseCase',
    'IGetCarDetailUseCase',
    'IUpdateCarUseCase',
    'IUpdateCarStatusUseCase',
  ],
})
export class CarModule {}
