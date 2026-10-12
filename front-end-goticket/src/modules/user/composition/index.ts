import type { IUserService } from "../application/port/user.service.interface";
import { UserService } from "../application/service/user.service";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";

export const userService: IUserService = new UserService(httpClient);
