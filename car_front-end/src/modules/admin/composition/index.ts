import type { IAdminOperatorService } from "../application/port/admin-operator.service.interface";
import { AdminOperatorService } from "../application/service/admin-operator.service";

const GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL || "";

export class AdminModuleFactory {
  public static createAdminOperatorService(
    customGatewayUrl?: string
  ): IAdminOperatorService {
    return new AdminOperatorService(customGatewayUrl || GATEWAY_URL);
  }
}

export const adminOperatorService: IAdminOperatorService =
  AdminModuleFactory.createAdminOperatorService();
