import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Inject,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../auth/auth-user';
import { hasRole } from '../../../auth/auth-user';
import { Public } from '../../../auth/public.decorator';
import { CreateTripDto } from '../dto/create-trip.dto';
import { GetTripsQueryDto } from '../dto/get-trips-query.dto';
import { UpdateTripStatusDto } from '../dto/update-trip-status.dto';
import { SearchTripsQueryDto } from '../dto/search-trips-query.dto';
import type { ICreateTripUseCase } from '../../application/port/create-trip.usecase.interface';
import type { IGetTripsUseCase } from '../../application/port/get-trips.usecase.interface';
import type { IUpdateTripStatusUseCase } from '../../application/port/update-trip-status.usecase.interface';
import type { ISearchTripsUseCase } from '../../application/port/search-trips.usecase.interface';
import { TripPresentationMapper } from '../mapper/trip-presentation.mapper';

@Controller('trips')
export class TripController {
  constructor(
    @Inject('ICreateTripUseCase')
    private readonly createTripUseCase: ICreateTripUseCase,
    @Inject('IGetTripsUseCase')
    private readonly getTripsUseCase: IGetTripsUseCase,
    @Inject('IUpdateTripStatusUseCase')
    private readonly updateTripStatusUseCase: IUpdateTripStatusUseCase,
    @Inject('ISearchTripsUseCase')
    private readonly searchTripsUseCase: ISearchTripsUseCase,
  ) {}

  @Get('search')
  @Public()
  async searchTrips(@Query() query: SearchTripsQueryDto) {
    const input = TripPresentationMapper.toSearchTripsInput(query);
    const result = await this.searchTripsUseCase.execute(input);
    return TripPresentationMapper.toSearchTripsApiResponse(result);
  }

  @Post()
  async createTrip(
    @Body() dto: CreateTripDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    const input = TripPresentationMapper.toCreateTripInput(dto, request.authUser!.id);
    const result = await this.createTripUseCase.execute(input);
    return TripPresentationMapper.toCreateTripApiResponse(result);
  }

  @Get()
  async getTrips(
    @Query() query: GetTripsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    const input = TripPresentationMapper.toGetTripsInput(query, request.authUser!.id);
    const result = await this.getTripsUseCase.execute(input);
    return TripPresentationMapper.toGetTripsApiResponse(result);
  }

  @Patch(':id/status')
  async updateTripStatus(
    @Param('id') tripId: string,
    @Body() dto: UpdateTripStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    const input = TripPresentationMapper.toUpdateTripStatusInput(tripId, dto, request.authUser!.id);
    const result = await this.updateTripStatusUseCase.execute(input);
    return TripPresentationMapper.toUpdateTripStatusApiResponse(result);
  }
}
