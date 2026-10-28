import type { UserSession } from '../../domain/entity/user-session.entity';

export interface IAuthService {
  /**
   * Lấy phiên đăng nhập hiện tại từ Identity/Gateway session cookie
   */
  getSession(signal?: AbortSignal): Promise<UserSession | null>;

  /**
   * Đăng xuất khỏi hệ thống
   */
  logout(): Promise<void>;

  /**
   * Tạo URL điều hướng sang SSO để đăng nhập
   */
  getLoginUrl(returnPath?: string): string;
  getRegisterUrl(returnPath?: string): string;
  getLogoutUrl(): string;
}
