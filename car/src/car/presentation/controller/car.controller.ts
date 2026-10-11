import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  Inject,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../auth/auth-user';
import { hasRole } from '../../../auth/auth-user';
import { CreateCarDto } from '../dto/create-car.dto';
import { GetCarsQueryDto } from '../dto/get-cars-query.dto';
import type { IAddCarUseCase } from '../../application/port/add-car.usecase.interface';
import type { IGetCarsUseCase } from '../../application/port/get-cars.usecase.interface';
import { CarPresentationMapper } from '../mapper/car-presentation.mapper';

@Controller('cars')
export class CarController {
  constructor(
    @Inject('IAddCarUseCase')
    private readonly addCarUseCase: IAddCarUseCase,
    @Inject('IGetCarsUseCase')
    private readonly getCarsUseCase: IGetCarsUseCase,
  ) {}

  @Post()
  async addCar(
    @Body() dto: CreateCarDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    const input = CarPresentationMapper.toAddCarInput(dto, request.authUser!.id);
    const result = await this.addCarUseCase.execute(input);
    return CarPresentationMapper.toAddCarApiResponse(result);
  }

  @Get()
  async getCars(
    @Query() query: GetCarsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    const input = CarPresentationMapper.toGetCarsInput(query, request.authUser!.id);
    const result = await this.getCarsUseCase.execute(input);
    return CarPresentationMapper.toGetCarsApiResponse(result);
  }
}
