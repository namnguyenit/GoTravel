import type { IUserService } from "../application/port/user.service.interface";
import { UserService } from "../application/service/user.service";

const GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL || "";

export class UserModuleFactory {
  public static createUserService(customGatewayUrl?: string): IUserService {
    return new UserService(customGatewayUrl || GATEWAY_URL);
  }
}

export const userService: IUserService = UserModuleFactory.createUserService();
