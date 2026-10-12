import type { IOperatorService } from "../application/port/operator.service.interface";
import { OperatorService } from "../application/service/operator.service";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";

export const operatorService: IOperatorService = new OperatorService(httpClient);
