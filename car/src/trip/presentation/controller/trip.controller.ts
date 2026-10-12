import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
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
import { UpdateDraftTripDto } from '../dto/update-draft-trip.dto';
import { SetTripStopsDto } from '../dto/set-trip-stops.dto';
import { SearchTripsQueryDto } from '../dto/search-trips-query.dto';
import type { ICreateTripUseCase } from '../../application/port/create-trip.usecase.interface';
import type { IGetTripsUseCase } from '../../application/port/get-trips.usecase.interface';
import type { IUpdateTripStatusUseCase } from '../../application/port/update-trip-status.usecase.interface';
import type { ISearchTripsUseCase } from '../../application/port/search-trips.usecase.interface';
import type { IUpdateDraftTripUseCase } from '../../application/port/update-draft-trip.usecase.interface';
import type { IGetManageTripDetailUseCase } from '../../application/port/get-manage-trip-detail.usecase.interface';
import type { ISetTripStopsUseCase } from '../../application/port/set-trip-stops.usecase.interface';
import { TripPresentationMapper } from '../mapper/trip-presentation.mapper';
import { ParseUUIDPipe } from '@nestjs/common';

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
    @Inject('IUpdateDraftTripUseCase')
    private readonly updateDraftTripUseCase: IUpdateDraftTripUseCase,
    @Inject('IGetManageTripDetailUseCase')
    private readonly getManageTripDetailUseCase: IGetManageTripDetailUseCase,
    @Inject('ISetTripStopsUseCase')
    private readonly setTripStopsUseCase: ISetTripStopsUseCase,
  ) {}

  @Get('search')
  @Public()
  async searchTrips(@Query() query: SearchTripsQueryDto) {
    const input = TripPresentationMapper.toSearchTripsInput(query);
    const result = await this.searchTripsUseCase.execute(input);
    return TripPresentationMapper.toSearchTripsApiResponse(result);
  }

  @Get(':id/manage')
  async getManageTripDetail(
    @Param('id', new ParseUUIDPipe()) tripId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (
      !hasRole(request.authUser!, 'TICKET_VENDOR') &&
      !hasRole(request.authUser!, 'STAFF')
    ) {
      throw new ForbiddenException();
    }
    const result = await this.getManageTripDetailUseCase.execute(
      tripId,
      request.authUser!.id,
    );
    return {
      success: true,
      code: 'GET_MANAGE_TRIP_DETAIL_SUCCESS',
      message: 'Lấy thông tin quản lý chuyến thành công',
      data: result,
    };
  }

  @Patch(':id/draft')
  async updateDraftTrip(
    @Param('id', new ParseUUIDPipe()) tripId: string,
    @Body() dto: UpdateDraftTripDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (
      !hasRole(request.authUser!, 'TICKET_VENDOR') &&
      !hasRole(request.authUser!, 'STAFF')
    ) {
      throw new ForbiddenException();
    }
    const result = await this.updateDraftTripUseCase.execute({
      tripId,
      userId: request.authUser!.id,
      dto,
    });
    return {
      success: true,
      code: 'UPDATE_DRAFT_TRIP_SUCCESS',
      message: 'Cập nhật chuyến nháp thành công',
      data: result,
    };
  }

  @Put(':id/stops')
  async setTripStops(
    @Param('id', new ParseUUIDPipe()) tripId: string,
    @Body() dto: SetTripStopsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (
      !hasRole(request.authUser!, 'TICKET_VENDOR') &&
      !hasRole(request.authUser!, 'STAFF')
    ) {
      throw new ForbiddenException();
    }
    const result = await this.setTripStopsUseCase.execute({
      tripId,
      userId: request.authUser!.id,
      dto,
    });
    return {
      success: true,
      code: 'SET_TRIP_STOPS_SUCCESS',
      message: 'Cấu hình điểm đón trả cho chuyến thành công',
      data: result,
    };
  }

  @Post()
  async createTrip(
    @Body() dto: CreateTripDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const input = TripPresentationMapper.toCreateTripInput(
      dto,
      request.authUser!.id,
    );
    const result = await this.createTripUseCase.execute(input);
    return TripPresentationMapper.toCreateTripApiResponse(result);
  }

  @Get()
  async getTrips(
    @Query() query: GetTripsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const input = TripPresentationMapper.toGetTripsInput(
      query,
      request.authUser!.id,
    );
    const result = await this.getTripsUseCase.execute(input);
    return TripPresentationMapper.toGetTripsApiResponse(result);
  }

  @Patch(':id/status')
  async updateTripStatus(
    @Param('id') tripId: string,
    @Body() dto: UpdateTripStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const input = TripPresentationMapper.toUpdateTripStatusInput(
      tripId,
      dto,
      request.authUser!.id,
    );
    const result = await this.updateTripStatusUseCase.execute(input);
    return TripPresentationMapper.toUpdateTripStatusApiResponse(result);
  }
}
