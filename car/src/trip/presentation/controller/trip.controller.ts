import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { CreateTripDto } from '../dto/create-trip.dto';
import { GetTripsQueryDto } from '../dto/get-trips-query.dto';
import { UpdateTripStatusDto } from '../dto/update-trip-status.dto';
import type { ICreateTripUseCase } from '../../application/port/create-trip.usecase.interface';
import type { IGetTripsUseCase } from '../../application/port/get-trips.usecase.interface';
import type { IUpdateTripStatusUseCase } from '../../application/port/update-trip-status.usecase.interface';
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
  ) {}

  @Post()
  async createTrip(
    @Body() dto: CreateTripDto,
    @Headers('x-user-id') headerUserId?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = headerUserId || bodyUserId;
    if (!userId) {
      throw new BadRequestException(
        'Không tìm thấy thông tin định danh người dùng (x-user-id header).',
      );
    }

    const input = TripPresentationMapper.toCreateTripInput(dto, userId);
    const result = await this.createTripUseCase.execute(input);
    return TripPresentationMapper.toCreateTripApiResponse(result);
  }

  @Get()
  async getTrips(
    @Query() query: GetTripsQueryDto,
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string,
  ) {
    const userId = headerUserId || queryUserId;
    if (!userId) {
      throw new BadRequestException(
        'Không tìm thấy thông tin định danh người dùng (x-user-id header).',
      );
    }

    const input = TripPresentationMapper.toGetTripsInput(query, userId);
    const result = await this.getTripsUseCase.execute(input);
    return TripPresentationMapper.toGetTripsApiResponse(result);
  }

  @Patch(':id/status')
  async updateTripStatus(
    @Param('id') tripId: string,
    @Body() dto: UpdateTripStatusDto,
    @Headers('x-user-id') headerUserId?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = headerUserId || bodyUserId;
    if (!userId) {
      throw new BadRequestException(
        'Không tìm thấy thông tin định danh người dùng (x-user-id header).',
      );
    }

    const input = TripPresentationMapper.toUpdateTripStatusInput(tripId, dto, userId);
    const result = await this.updateTripStatusUseCase.execute(input);
    return TripPresentationMapper.toUpdateTripStatusApiResponse(result);
  }
}
