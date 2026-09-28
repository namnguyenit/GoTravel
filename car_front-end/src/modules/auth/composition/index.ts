import type { IAuthService } from "../application/port/auth.service.interface";
import { AuthService } from "../application/service/auth.service";
import { LocalTokenStorage } from "../infrastructure/storage/token.storage";

const GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL || "";

export const tokenStorage = new LocalTokenStorage();

/**
 * Factory Pattern cho Auth Module (Khởi tạo khi có nhu cầu đặc biệt)
 */
export class AuthModuleFactory {
  public static createAuthService(customGatewayUrl?: string): IAuthService {
    return new AuthService(customGatewayUrl || GATEWAY_URL, tokenStorage);
  }
}

/**
 * Shared Single Instance cho Auth Module (Mặc định dùng trong toàn ứng dụng)
 */
export const authService: IAuthService = AuthModuleFactory.createAuthService();
