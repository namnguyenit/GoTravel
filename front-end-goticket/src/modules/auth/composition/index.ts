import type { IAuthService } from '../application/port/auth.service.interface';
import { AuthService } from '../application/service/auth.service';
import { httpClient } from '../../../shared/infrastructure/http/HttpPort';

export class AuthModuleFactory {
  public static createAuthService(): IAuthService {
    return new AuthService(httpClient);
  }
}

/**
 * Single Instance dùng chung cho Auth Service
 */
export const authService: IAuthService = AuthModuleFactory.createAuthService();
