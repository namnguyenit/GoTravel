import type { OperatorStatusEntity } from "../../domain/entity/operator-status.entity";

export interface RequestOperatorApplicationDTO {
  name: string;
  phone: string;
  address: string;
}

export interface IOperatorService {
  getMyOperatorStatus(): Promise<OperatorStatusEntity>;
  requestOperatorApplication(dto: RequestOperatorApplicationDTO): Promise<any>;
}
