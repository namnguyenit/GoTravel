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
import { CreateRouteDto } from '../dto/create-route.dto';
import { GetRoutesQueryDto } from '../dto/get-routes-query.dto';
import { UpdateRouteStatusDto } from '../dto/update-route-status.dto';
import type { ICreateRouteUseCase } from '../../application/port/create-route.usecase.interface';
import type { IGetRoutesUseCase } from '../../application/port/get-routes.usecase.interface';
import type { IUpdateRouteStatusUseCase } from '../../application/port/update-route-status.usecase.interface';
import type { IGetRouteLocationsUseCase } from '../../application/port/get-route-locations.usecase.interface';
import { RoutePresentationMapper } from '../mapper/route-presentation.mapper';

@Controller('routes')
export class RouteController {
  constructor(
    @Inject('ICreateRouteUseCase')
    private readonly createRouteUseCase: ICreateRouteUseCase,
    @Inject('IGetRoutesUseCase')
    private readonly getRoutesUseCase: IGetRoutesUseCase,
    @Inject('IUpdateRouteStatusUseCase')
    private readonly updateRouteStatusUseCase: IUpdateRouteStatusUseCase,
    @Inject('IGetRouteLocationsUseCase')
    private readonly getRouteLocationsUseCase: IGetRouteLocationsUseCase,
  ) {}

  @Get('locations')
  async getLocations() {
    const result = await this.getRouteLocationsUseCase.execute();
    return RoutePresentationMapper.toGetRouteLocationsApiResponse(result);
  }

  @Post()
  async createRoute(
    @Body() dto: CreateRouteDto,
    @Headers('x-user-id') headerUserId?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = headerUserId || bodyUserId;
    if (!userId) {
      throw new BadRequestException(
        'Không tìm thấy thông tin định danh người dùng (x-user-id header).',
      );
    }

    const input = RoutePresentationMapper.toCreateRouteInput(dto, userId);
    const result = await this.createRouteUseCase.execute(input);
    return RoutePresentationMapper.toCreateRouteApiResponse(result);
  }

  @Get()
  async getRoutes(
    @Query() query: GetRoutesQueryDto,
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string,
  ) {
    const userId = headerUserId || queryUserId;
    if (!userId) {
      throw new BadRequestException(
        'Không tìm thấy thông tin định danh người dùng (x-user-id header).',
      );
    }

    const input = RoutePresentationMapper.toGetRoutesInput(query, userId);
    const result = await this.getRoutesUseCase.execute(input);
    return RoutePresentationMapper.toGetRoutesApiResponse(result);
  }

  @Patch(':id/status')
  async updateRouteStatus(
    @Param('id') routeId: string,
    @Body() dto: UpdateRouteStatusDto,
    @Headers('x-user-id') headerUserId?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = headerUserId || bodyUserId;
    if (!userId) {
      throw new BadRequestException(
        'Không tìm thấy thông tin định danh người dùng (x-user-id header).',
      );
    }

    const result = await this.updateRouteStatusUseCase.execute({
      userId,
      routeId,
      status: dto.status,
    });
    return RoutePresentationMapper.toUpdateRouteStatusApiResponse(result);
  }
}
