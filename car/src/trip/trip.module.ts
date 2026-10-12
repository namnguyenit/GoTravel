import { StaffModule } from '../staff/staff.module';
import { PrismaGetManageTripDetailManagement } from './infrastructure/repository/prisma-get-manage-trip-detail.management';
import { PrismaSetTripStopsManagement } from './infrastructure/repository/prisma-set-trip-stops.management';
import { PrismaUpdateDraftTripManagement } from './infrastructure/repository/prisma-update-draft-trip.management';
import { Module } from '@nestjs/common';
import { TripController } from './presentation/controller/trip.controller';
import { CreateTripUseCase } from './application/usecase/create-trip.usecase';
import { GetTripsUseCase } from './application/usecase/get-trips.usecase';
import { UpdateTripStatusUseCase } from './application/usecase/update-trip-status.usecase';
import { SearchTripsUseCase } from './application/usecase/search-trips.usecase';
import { UpdateDraftTripUseCase } from './application/usecase/update-draft-trip.usecase';
import { GetManageTripDetailUseCase } from './application/usecase/get-manage-trip-detail.usecase';
import { SetTripStopsUseCase } from './application/usecase/set-trip-stops.usecase';
import { PrismaTripRepository } from './infrastructure/repository/prisma-trip.repository';
import { TransportModule } from '../transport/transport.module';

@Module({
  imports: [TransportModule, StaffModule],
  controllers: [TripController],
  providers: [
    {
      provide: 'ManageTripDetailPort',
      useClass: PrismaGetManageTripDetailManagement,
    },
    {
      provide: 'TripStopsManagementPort',
      useClass: PrismaSetTripStopsManagement,
    },
    {
      provide: 'DraftTripManagementPort',
      useClass: PrismaUpdateDraftTripManagement,
    },
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
    {
      provide: 'ISearchTripsUseCase',
      useClass: SearchTripsUseCase,
    },
    {
      provide: 'IUpdateDraftTripUseCase',
      useClass: UpdateDraftTripUseCase,
    },
    {
      provide: 'IGetManageTripDetailUseCase',
      useClass: GetManageTripDetailUseCase,
    },
    {
      provide: 'ISetTripStopsUseCase',
      useClass: SetTripStopsUseCase,
    },
  ],
  exports: [
    'ITripRepository',
    'ICreateTripUseCase',
    'IGetTripsUseCase',
    'IUpdateTripStatusUseCase',
    'ISearchTripsUseCase',
    'IUpdateDraftTripUseCase',
    'IGetManageTripDetailUseCase',
    'ISetTripStopsUseCase',
  ],
})
export class TripModule {}
