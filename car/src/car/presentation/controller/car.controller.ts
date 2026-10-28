import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  Req,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../auth/auth-user';
import { hasRole } from '../../../auth/auth-user';
import { CreateCarDto } from '../dto/create-car.dto';
import { GetCarsQueryDto } from '../dto/get-cars-query.dto';
import { UpdateCarDto } from '../dto/update-car.dto';
import { UpdateCarStatusDto } from '../dto/update-car-status.dto';
import type { IAddCarUseCase } from '../../application/port/add-car.usecase.interface';
import type { IGetCarsUseCase } from '../../application/port/get-cars.usecase.interface';
import type { IGetCarDetailUseCase } from '../../application/port/get-car-detail.usecase.interface';
import type { IUpdateCarUseCase } from '../../application/port/update-car.usecase.interface';
import type { IUpdateCarStatusUseCase } from '../../application/port/update-car-status.usecase.interface';
import { CarPresentationMapper } from '../mapper/car-presentation.mapper';
import { DeleteCarUseCase } from '../../application/usecase/delete-car.usecase';

@Controller('cars')
export class CarController {
  constructor(
    private readonly deleteCarUseCase: DeleteCarUseCase,
    @Inject('IAddCarUseCase')
    private readonly addCarUseCase: IAddCarUseCase,
    @Inject('IGetCarsUseCase')
    private readonly getCarsUseCase: IGetCarsUseCase,
    @Inject('IGetCarDetailUseCase')
    private readonly getCarDetailUseCase: IGetCarDetailUseCase,
    @Inject('IUpdateCarUseCase')
    private readonly updateCarUseCase: IUpdateCarUseCase,
    @Inject('IUpdateCarStatusUseCase')
    private readonly updateCarStatusUseCase: IUpdateCarStatusUseCase,
  ) {}

  @Post()
  async addCar(
    @Body() dto: CreateCarDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const input = CarPresentationMapper.toAddCarInput(
      dto,
      request.authUser!.id,
    );
    const result = await this.addCarUseCase.execute(input);
    return CarPresentationMapper.toAddCarApiResponse(result);
  }

  @Get()
  async getCars(
    @Query() query: GetCarsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const input = CarPresentationMapper.toGetCarsInput(
      query,
      request.authUser!.id,
    );
    const result = await this.getCarsUseCase.execute(input);
    return CarPresentationMapper.toGetCarsApiResponse(result);
  }

  @Get(':id')
  async getCarDetail(
    @Param('id', new ParseUUIDPipe()) carId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const result = await this.getCarDetailUseCase.execute(
      carId,
      request.authUser!.id,
    );
    return CarPresentationMapper.toCarDetailApiResponse(result);
  }

  @Delete(':id')
  async deleteCar(
    @Param('id', new ParseUUIDPipe()) carId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR')) throw new ForbiddenException();
    await this.deleteCarUseCase.execute(carId, request.authUser!.id);
    return { success: true, code: 'DELETE_CAR_SUCCESS', message: 'Đã xóa xe khỏi đội xe. Lịch sử chuyến và vé được giữ nguyên.', data: { id: carId } };
  }

  @Patch(':id')
  async updateCar(
    @Param('id', new ParseUUIDPipe()) carId: string,
    @Body() dto: UpdateCarDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const result = await this.updateCarUseCase.execute({
      carId,
      userId: request.authUser!.id,
      name: dto.name,
      type: dto.type,
      licensePlate: dto.licensePlate,
    });
    return CarPresentationMapper.toUpdateCarApiResponse(result);
  }

  @Patch(':id/status')
  async updateCarStatus(
    @Param('id', new ParseUUIDPipe()) carId: string,
    @Body() dto: UpdateCarStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!hasRole(request.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const result = await this.updateCarStatusUseCase.execute({
      carId,
      userId: request.authUser!.id,
      status: dto.status,
    });
    return CarPresentationMapper.toUpdateCarStatusApiResponse(result);
  }
}
