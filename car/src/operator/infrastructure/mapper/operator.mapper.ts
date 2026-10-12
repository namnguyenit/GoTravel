import { Operator as PrismaOperator } from '@prisma/client';
import { Operator } from '../../domain/entity/operator.entity';

export class OperatorMapper {
  public static toDomain(model: PrismaOperator): Operator {
    return Operator.reconstruct({
      id: model.id,
      userId: model.userId,
      name: model.name,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  public static toPersistence(entity: Operator) {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      status: entity.status,
    };
  }
}
