import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { IOperatorStopRepository } from '../domain/repository/operator-stop.repository.interface';
import { OperatorStop } from '../domain/entity/operator-stop.entity';

interface CreateOperatorStopDto {
  name: string;
  address: string;
  province: string;
}
interface UpdateOperatorStopDto {
  name?: string;
  address?: string;
  province?: string;
}
interface GetOperatorStopsQueryDto {
  keyword?: string;
  province?: string;
  active?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class OperatorStopService {
  constructor(
    @Inject('IOperatorStopRepository')
    private readonly repository: IOperatorStopRepository,
  ) {}

  async create(
    userId: string,
    dto: CreateOperatorStopDto,
  ): Promise<OperatorStop> {
    const operatorId = await this.requireOperatorId(userId);
    const stop = new OperatorStop({
      operatorId,
      name: dto.name,
      address: dto.address,
      province: dto.province,
    });
    return this.repository.save(stop);
  }

  async findMany(
    userId: string,
    query: GetOperatorStopsQueryDto,
  ): Promise<{
    stops: OperatorStop[];
    total: number;
    page: number;
    limit: number;
  }> {
    const operatorId = await this.requireOperatorId(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const active =
      query.active !== undefined ? query.active === 'true' : undefined;

    const result = await this.repository.findManyWithFilters({
      operatorId,
      keyword: query.keyword,
      province: query.province,
      active,
      page,
      limit,
    });

    return {
      stops: result.stops,
      total: result.total,
      page,
      limit,
    };
  }

  async findById(userId: string, stopId: string): Promise<OperatorStop> {
    const operatorId = await this.requireOperatorId(userId);
    const stop = await this.repository.findById(stopId);
    if (!stop || stop.operatorId !== operatorId) {
      throw new NotFoundException('Không tìm thấy điểm dừng');
    }
    return stop;
  }

  async update(
    userId: string,
    stopId: string,
    dto: UpdateOperatorStopDto,
  ): Promise<OperatorStop> {
    const stop = await this.findById(userId, stopId);
    stop.update(dto.name, dto.address, dto.province);
    return this.repository.save(stop);
  }

  async archive(userId: string, stopId: string): Promise<OperatorStop> {
    const stop = await this.findById(userId, stopId);
    stop.archive();
    return this.repository.save(stop);
  }

  private async requireOperatorId(userId: string): Promise<string> {
    const operatorId = await this.repository.findOperatorIdByUserId(userId);
    if (!operatorId) {
      throw new ForbiddenException('Tài khoản chưa được liên kết với nhà xe');
    }
    return operatorId;
  }
}
