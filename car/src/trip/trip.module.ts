import { Module } from '@nestjs/common';
import { TripController } from './presentation/controller/trip.controller';
import { CreateTripUseCase } from './application/usecase/create-trip.usecase';
import { GetTripsUseCase } from './application/usecase/get-trips.usecase';
import { UpdateTripStatusUseCase } from './application/usecase/update-trip-status.usecase';
import { PrismaTripRepository } from './infrastructure/repository/prisma-trip.repository';

@Module({
  controllers: [TripController],
  providers: [
    {
      provide: 'ITripRepository',
      useClass: PrismaTripRepository,
    },
    {
      provide: 'ICreateTripUseCase',
      useClass: CreateTripUseCase,
    },
    {
      provide: 'IGetTripsUseCase',
      useClass: GetTripsUseCase,
    },
    {
      provide: 'IUpdateTripStatusUseCase',
      useClass: UpdateTripStatusUseCase,
    },
  ],
  exports: [
    'ITripRepository',
    'ICreateTripUseCase',
    'IGetTripsUseCase',
    'IUpdateTripStatusUseCase',
  ],
})
export class TripModule {}
