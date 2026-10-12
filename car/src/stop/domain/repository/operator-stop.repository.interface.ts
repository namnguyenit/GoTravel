import { OperatorStop } from '../entity/operator-stop.entity';

export interface OperatorStopFilterParams {
  operatorId: string;
  keyword?: string;
  province?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface IOperatorStopRepository {
  save(stop: OperatorStop): Promise<OperatorStop>;
  findById(id: string): Promise<OperatorStop | null>;
  findManyWithFilters(
    params: OperatorStopFilterParams,
  ): Promise<{ stops: OperatorStop[]; total: number }>;
  findOperatorIdByUserId(userId: string): Promise<string | null>;
}
