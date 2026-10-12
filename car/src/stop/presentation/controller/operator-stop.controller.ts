import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../auth/auth-user';
import { hasRole } from '../../../auth/auth-user';
import { OperatorStopService } from '../../application/operator-stop.service';
import { CreateOperatorStopDto } from '../dto/create-stop.dto';
import { UpdateOperatorStopDto } from '../dto/update-stop.dto';
import { GetOperatorStopsQueryDto } from '../dto/get-stops-query.dto';

@Controller('operators/me/stops')
export class OperatorStopController {
  constructor(private readonly service: OperatorStopService) {}

  @Post()
  async create(
    @Body() dto: CreateOperatorStopDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!hasRole(req.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const stop = await this.service.create(req.authUser!.id, dto);
    return {
      success: true,
      code: 'CREATE_STOP_SUCCESS',
      message: 'Tạo điểm dừng thành công',
      data: this.toResponse(stop),
    };
  }

  @Get()
  async findMany(
    @Query() query: GetOperatorStopsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!hasRole(req.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const result = await this.service.findMany(req.authUser!.id, query);
    return {
      success: true,
      code: 'GET_STOPS_SUCCESS',
      message: 'Lấy danh sách điểm dừng thành công',
      data: {
        stops: result.stops.map(this.toResponse),
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };
  }

  @Get(':stopId')
  async findById(
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!hasRole(req.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const stop = await this.service.findById(req.authUser!.id, stopId);
    return {
      success: true,
      code: 'GET_STOP_DETAIL_SUCCESS',
      message: 'Lấy thông tin điểm dừng thành công',
      data: this.toResponse(stop),
    };
  }

  @Patch(':stopId')
  async update(
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Body() dto: UpdateOperatorStopDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!hasRole(req.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const stop = await this.service.update(req.authUser!.id, stopId, dto);
    return {
      success: true,
      code: 'UPDATE_STOP_SUCCESS',
      message: 'Cập nhật điểm dừng thành công',
      data: this.toResponse(stop),
    };
  }

  @Patch(':stopId/archive')
  async archive(
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!hasRole(req.authUser!, 'TICKET_VENDOR'))
      throw new ForbiddenException();
    const stop = await this.service.archive(req.authUser!.id, stopId);
    return {
      success: true,
      code: 'ARCHIVE_STOP_SUCCESS',
      message: 'Lưu trữ điểm dừng thành công',
      data: this.toResponse(stop),
    };
  }

  private toResponse(
    stop: import('../../domain/entity/operator-stop.entity').OperatorStop,
  ) {
    return {
      id: stop.id,
      operatorId: stop.operatorId,
      name: stop.name,
      address: stop.address,
      province: stop.province,
      active: stop.active,
      createdAt: stop.createdAt,
      updatedAt: stop.updatedAt,
    };
  }
}
