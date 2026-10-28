import type { OperatorStatusEntity } from "../../domain/entity/operator-status.entity";

export interface IOperatorService {
  getMyOperatorStatus(): Promise<OperatorStatusEntity>;
}
