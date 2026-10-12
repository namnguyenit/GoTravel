import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperatorStop } from '../../domain/entity/operator-stop.entity';
import {
  IOperatorStopRepository,
  OperatorStopFilterParams,
} from '../../domain/repository/operator-stop.repository.interface';

@Injectable()
export class PrismaOperatorStopRepository implements IOperatorStopRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(stop: OperatorStop): Promise<OperatorStop> {
    const data = {
      operatorId: stop.operatorId,
      name: stop.name,
      address: stop.address,
      province: stop.province,
      active: stop.active,
    };

    if (stop.id) {
      const updated = await (this.prisma as any).operatorStop.update({
        where: { id: stop.id },
        data,
      });
      return this.toDomain(updated);
    }

    const created = await (this.prisma as any).operatorStop.create({
      data,
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<OperatorStop | null> {
    const model = await (this.prisma as any).operatorStop.findUnique({
      where: { id },
    });
    return model ? this.toDomain(model) : null;
  }

  async findManyWithFilters(
    params: OperatorStopFilterParams,
  ): Promise<{ stops: OperatorStop[]; total: number }> {
    const {
      operatorId,
      keyword,
      province,
      active,
      page = 1,
      limit = 20,
    } = params;
    const where: any = { operatorId };

    if (active !== undefined) {
      where.active = active;
    }

    if (province && province.trim() !== '') {
      where.province = { contains: province.trim(), mode: 'insensitive' };
    }

    if (keyword && keyword.trim() !== '') {
      const term = keyword.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [models, total] = await Promise.all([
      (this.prisma as any).operatorStop.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (this.prisma as any).operatorStop.count({ where }),
    ]);

    return {
      stops: models.map((m: any) => this.toDomain(m)),
      total,
    };
  }

  async findOperatorIdByUserId(userId: string): Promise<string | null> {
    const operator = await this.prisma.operator.findFirst({
      where: { userId },
    });
    return operator ? operator.id : null;
  }

  private toDomain(model: any): OperatorStop {
    return new OperatorStop({
      id: model.id,
      operatorId: model.operatorId,
      name: model.name,
      address: model.address,
      province: model.province,
      active: model.active,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }
}
