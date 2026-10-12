import type { IOperatorService } from "../port/operator.service.interface";
import { OperatorStatusEntity } from "../../domain/entity/operator-status.entity";
import { httpClient, type IHttpClient } from "@/shared/infrastructure/http/HttpPort";

export class OperatorService implements IOperatorService {
  private readonly http: IHttpClient;

  constructor(http: IHttpClient = httpClient) {
    this.http = http;
  }

  async getMyOperatorStatus(): Promise<OperatorStatusEntity> {
    try {
      const data = await this.http.get<any>("/api/v1/operators/me/profile");
      return new OperatorStatusEntity({
        isOperator: Boolean(data?.id),
        operator: data?.id ? {
          id: data.id,
          userId: data.userId || "",
          name: data.displayName || data.name || "Nhà xe",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } : undefined,
      });
    } catch {
      return new OperatorStatusEntity({ isOperator: false });
    }
  }

  async requestOperatorApplication(dto: {
    name: string;
    phone: string;
    address: string;
  }): Promise<any> {
    void dto;
    throw new Error("Hồ sơ nhà xe được đăng ký tại trang KYC GoID.");
  }
}
