import { Inject, Injectable } from '@nestjs/common';
import { IGetOperatorsUseCase } from '../port/get-operators.usecase.interface';
import { GetOperatorsInput } from '../dto/get-operators.input';
import { GetOperatorsOutput } from '../dto/get-operators.output';
import type { IOperatorRepository } from '../../domain/repository/operator.repository.interface';

@Injectable()
export class GetOperatorsUseCase implements IGetOperatorsUseCase {
  constructor(
    @Inject('IOperatorRepository')
    private readonly operatorRepo: IOperatorRepository,
  ) {}

  async execute(input: GetOperatorsInput): Promise<GetOperatorsOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 10));

    const { operators, total } = await this.operatorRepo.findAll({
      search: input.search?.trim(),
      page,
      limit,
      sortBy: input.sortBy || 'createdAt',
      sortOrder: input.sortOrder || 'desc',
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: operators.map((op) => ({
        id: op.id!,
        userId: op.userId,
        name: op.name,
        status: op.status,
        createdAt: op.createdAt!,
        updatedAt: op.updatedAt!,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
