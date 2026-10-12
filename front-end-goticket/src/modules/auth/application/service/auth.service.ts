import { ApiError, type IHttpClient } from '../../../../shared/infrastructure/http/HttpPort';
import { buildSsoUrl } from '../../../../shared/infrastructure/platform-domains';
import type { IAuthService } from '../port/auth.service.interface';
import { UserSession, type AppRole, type StaffCapability } from '../../domain/entity/user-session.entity';

interface RawMeResponse {
  id?: string;
  userId?: string;
  email?: string;
  fullName?: string;
  name?: string;
  phoneNumber?: string;
  phone?: string;
  avatarUrl?: string;
  roles?: string[];
  role?: string;
  authorities?: Array<{ authority: string }>;
  userProfile?: {
    fullName?: string;
    phoneNumber?: string;
    avatarUrl?: string;
  };
}

interface RawStaffAssignments {
  operatorId: string;
  operatorName?: string;
  allowedCapabilities: string[];
  allowedTripIds: string[];
  allTrips: boolean;
}

interface RawOperatorProfile {
  id: string;
  name: string;
  displayName?: string | null;
  status: string;
}

export class AuthService implements IAuthService {
  constructor(private readonly http: IHttpClient) {}

  async getSession(): Promise<UserSession | null> {
    try {
      // Refresh the shared HttpOnly session and readable CSRF cookie before profile requests.
      const session = await this.http.get<{ authenticated: boolean; userId: string; roles: string[] }>('/api/v1/auth/session', { cache: 'no-store' });
      if (!session?.authenticated) return null;
      const raw = await this.http.get<RawMeResponse>('/api/v1/me', { cache: 'no-store' });
      if (!raw || (!raw.id && !raw.userId)) {
        throw new Error('Máy chủ chưa trả về thông tin tài khoản. Vui lòng thử lại.');
      }

      const id = raw.id || raw.userId || '';
      const email = raw.email || '';
      const fullName = raw.userProfile?.fullName || raw.fullName || raw.name || email.split('@')[0] || 'Người dùng';
      const phone = raw.userProfile?.phoneNumber || raw.phone || raw.phoneNumber || null;
      const avatarUrl = raw.userProfile?.avatarUrl || raw.avatarUrl || null;

      // Chuẩn hóa roles từ backend (ROLE_ADMIN -> ADMIN, ROLE_TICKET_VENDOR -> TICKET_VENDOR, v.v.)
      const rawRolesList: string[] = [];
      if (Array.isArray(session.roles)) rawRolesList.push(...session.roles);
      if (Array.isArray(raw.roles)) rawRolesList.push(...raw.roles);
      if (raw.role) rawRolesList.push(raw.role);
      if (Array.isArray(raw.authorities)) {
        rawRolesList.push(...raw.authorities.map((a) => a.authority));
      }

      const normalizedRoles: AppRole[] = [];
      for (const r of rawRolesList) {
        const clean = String(r).toUpperCase().replace(/^ROLE_/, '');
        if (clean === 'ADMIN' && !normalizedRoles.includes('ADMIN')) normalizedRoles.push('ADMIN');
        if (clean === 'TICKET_VENDOR' && !normalizedRoles.includes('TICKET_VENDOR')) normalizedRoles.push('TICKET_VENDOR');
        if (clean === 'STAFF' && !normalizedRoles.includes('STAFF')) normalizedRoles.push('STAFF');
        if (clean === 'CUSTOMER' && !normalizedRoles.includes('CUSTOMER')) normalizedRoles.push('CUSTOMER');
        if (clean === 'USER' && !normalizedRoles.includes('CUSTOMER')) normalizedRoles.push('CUSTOMER');
      }

      if (normalizedRoles.length === 0) {
        normalizedRoles.push('CUSTOMER');
      }

      let operatorId: string | null = null;
      let operatorName: string | null = null;
      let staffCapabilities: StaffCapability[] = [];
      let staffTripIds: string[] = [];
      let staffAllTrips = false;

      // Nếu là TICKET_VENDOR, lấy thông tin nhà xe
      if (normalizedRoles.includes('TICKET_VENDOR')) {
        try {
          const op = await this.http.get<RawOperatorProfile>('/api/v1/operators/me/profile');
          if (op && op.id) {
            operatorId = op.id;
            operatorName = op.displayName || op.name;
          }
        } catch {
          // Vendor chưa có profile hoặc đang chờ duyệt Identity
        }
      }

      // Nếu là STAFF, lấy thông tin phân công và quyền hạn
      if (normalizedRoles.includes('STAFF')) {
        try {
          const res = await this.http.get<any>('/api/v1/staff/me/assignments');
          const assignments = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
            ? res
            : [];

          if (assignments.length > 0) {
            const first = assignments[0];
            operatorId = first.operatorId || first.operator?.id || null;
            operatorName = first.operator?.name || null;

            const caps: StaffCapability[] = [];
            const trips: string[] = [];
            let all = false;

            for (const a of assignments) {
              if (a.canCheckIn && !caps.includes('CHECK_IN')) caps.push('CHECK_IN');
              if (a.canSellCash) {
                if (!caps.includes('SELL_CASH')) caps.push('SELL_CASH');
              }
              if (a.canManageTrip && !caps.includes('MANAGE_TRIP')) caps.push('MANAGE_TRIP');
              if (a.canCloseShift) {
                if (!caps.includes('CLOSE_SHIFT')) caps.push('CLOSE_SHIFT');
                if (!caps.includes('CASH_VIEW')) caps.push('CASH_VIEW');
              }

              if (!a.tripIds || a.tripIds.length === 0) {
                all = true;
              } else if (Array.isArray(a.tripIds)) {
                trips.push(...a.tripIds);
              }
            }

            staffCapabilities = caps;
            staffTripIds = Array.from(new Set(trips));
            staffAllTrips = all;
          }
        } catch {
          // Staff chưa có phân công hoặc đã bị thu hồi quyền
        }
      }

      return new UserSession({
        id,
        email,
        fullName,
        phone,
        avatarUrl,
        roles: normalizedRoles,
        operatorId,
        operatorName,
        staffCapabilities,
        staffTripIds,
        staffAllTrips,
      });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) return null;
      throw reason;
    }
  }

  async logout(): Promise<void> {
    await this.http.post('/api/v1/auth/logout');
    // Chuyển hướng về trang chủ
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  getLoginUrl(returnPath?: string): string {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3334';
    return buildSsoUrl(currentOrigin, returnPath, 'login', import.meta.env.VITE_SSO_URL);
  }

  getRegisterUrl(returnPath?: string): string {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3334';
    return buildSsoUrl(currentOrigin, returnPath, 'register', import.meta.env.VITE_SSO_URL);
  }
}
