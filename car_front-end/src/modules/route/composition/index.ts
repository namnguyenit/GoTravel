import { RouteService } from "../application/service/route.service";
import type { IRouteService } from "../application/port/route.service.interface";

const API_BASE_URL =
  import.meta.env.VITE_API_GATEWAY_URL || "";

export const routeService: IRouteService = new RouteService(API_BASE_URL);
