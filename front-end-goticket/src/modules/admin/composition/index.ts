import type { IAdminOperatorService } from "../application/port/admin-operator.service.interface";
import { AdminOperatorService } from "../application/service/admin-operator.service";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";

export const adminOperatorService: IAdminOperatorService = new AdminOperatorService(httpClient);
