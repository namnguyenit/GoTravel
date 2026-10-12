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
import { CreateRouteDto } from '../dto/create-route.dto';
import { UpdateRouteDto } from '../dto/update-route.dto';
import { GetRoutesQueryDto } from '../dto/get-routes-query.dto';
import { UpdateRouteStatusDto } from '../dto/update-route-status.dto';
import type { ICreateRouteUseCase } from '../../application/port/create-route.usecase.interface';
import type { IGetRoutesUseCase } from '../../application/port/get-routes.usecase.interface';
import type { IUpdateRouteUseCase } from '../../application/port/update-route.usecase.interface';
import type { IUpdateRouteStatusUseCase } from '../../application/port/update-route-status.usecase.interface';
import type { IGetRouteLocationsUseCase } from '../../application/port/get-route-locations.usecase.interface';
import { RoutePresentationMapper } from '../mapper/route-presentation.mapper';
import { ParseUUIDPipe } from '@nestjs/common';

@Controller('routes')
export class RouteController {
  constructor(
    @Inject('ICreateRouteUseCase')
    private readonly createRouteUseCase: ICreateRouteUseCase,
    @Inject('IGetRoutesUseCase')
    private readonly getRoutesUseCase: IGetRoutesUseCase,
    @Inject('IUpdateRouteUseCase')
    private readonly updateRouteUseCase: IUpdateRouteUseCase,
    @Inject('IUpdateRouteStatusUseCase')
    private readonly updateRouteStatusUseCase: IUpdateRouteStatusUseCase,
    @Inject('IGetRouteLocationsUseCase')
    private readonly getRouteLocationsUseCase: IGetRouteLocationsUseCase,
  ) {}

  @Get('locations')
  @Public()
  async getLocations() {
    const result = await this.getRouteLocationsUseCase.execute();
    return RoutePresentationMapper.toGetRouteLocationsApiResponse(result);
  }

  @Post()
  async createRoute(
    @Body() dto: CreateRouteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const input = RoutePresentationMapper.toCreateRouteInput(
      dto,
      request.authUser!.id,
    );
    const result = await this.createRouteUseCase.execute(input);
    return RoutePresentationMapper.toCreateRouteApiResponse(result);
  }

  @Get()
  async getRoutes(
    @Query() query: GetRoutesQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const input = RoutePresentationMapper.toGetRoutesInput(
      query,
      request.authUser!.id,
    );
    const result = await this.getRoutesUseCase.execute(input);
    return RoutePresentationMapper.toGetRoutesApiResponse(result);
  }

  @Patch(':id')
  async updateRoute(
    @Param('id', new ParseUUIDPipe()) routeId: string,
    @Body() dto: UpdateRouteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const result = await this.updateRouteUseCase.execute({
      routeId,
      userId: request.authUser!.id,
      dto,
    });
    return RoutePresentationMapper.toUpdateRouteApiResponse(result);
  }

  @Patch(':id/status')
  async updateRouteStatus(
    @Param('id') routeId: string,
    @Body() dto: UpdateRouteStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const result = await this.updateRouteStatusUseCase.execute({
      userId: request.authUser!.id,
      routeId,
      status: dto.status,
    });
    return RoutePresentationMapper.toUpdateRouteStatusApiResponse(result);
  }
}
