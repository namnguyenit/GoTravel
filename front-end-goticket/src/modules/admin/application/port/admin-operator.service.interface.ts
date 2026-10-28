import type { OperatorEntity } from "../../domain/entity/operator.entity";
import type { AdminUserDetailEntity } from "../../domain/entity/admin-user-detail.entity";
import type { OperatorApplicationEntity } from "../../domain/entity/operator-application.entity";

export interface GetOperatorsParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "name";
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetOperatorsResult {
  data: OperatorEntity[];
  pagination: PaginationMeta;
}

export interface ProcessApplicationDTO {
  applicationId: string;
  status: "APPROVED" | "REJECTED";
  rejectReason?: string;
}

export interface IAdminOperatorService {
  getOperators(params?: GetOperatorsParams): Promise<GetOperatorsResult>;
  getUserDetailById(userId: string): Promise<AdminUserDetailEntity>;
  getOperatorApplications(
    status?: string, page?: number, keyword?: string
  ): Promise<{ data: OperatorApplicationEntity[]; totalPages: number; totalElements: number; counts: Record<string, number> }>;
  processOperatorApplication(dto: ProcessApplicationDTO): Promise<void>;
  updateOperatorStatus(operatorId: string, status: "ACTIVE" | "SUSPENDED"): Promise<void>;
}
