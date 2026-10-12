import { RouteService } from "../application/service/route.service";
import type { IRouteService } from "../application/port/route.service.interface";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";

export const routeService: IRouteService = new RouteService(httpClient);
