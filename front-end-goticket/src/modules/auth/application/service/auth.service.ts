import { ApiError, type IHttpClient } from '../../../../shared/infrastructure/http/HttpPort';
import { buildSsoUrl, ssoOrigin } from '../../../../shared/infrastructure/platform-domains';
import { safeReturnPath } from '../auth-navigation';
import type { IAuthService } from '../port/auth.service.interface';
import { UserSession, type AppRole, type StaffCapability, type StaffAssignment } from '../../domain/entity/user-session.entity';

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

  async getSession(signal?: AbortSignal): Promise<UserSession | null> {
    try {
      // Refresh the shared HttpOnly session and readable CSRF cookie before profile requests.
      let session = await this.http.get<{ authenticated: boolean; userId: string; roles: string[] }>('/api/v1/auth/session', { cache: 'no-store', signal });
      if (!session?.authenticated) return null;
      const raw = await this.http.get<RawMeResponse>('/api/v1/me', { cache: 'no-store', signal });
      if (!raw || (!raw.id && !raw.userId)) {
        throw new Error('Máy chủ chưa trả về thông tin tài khoản. Vui lòng thử lại.');
      }

      const id = raw.id || raw.userId || '';
      if (id !== session.userId) {
        throw new Error('Tài khoản vừa thay đổi trong lúc tải phiên. Vui lòng thử lại.');
      }
      // /me reflects current Identity roles; the shared cookie may predate KYC approval.
      // Refresh the SIGNED session rather than granting rights from a profile in the browser.
      const rolesKey = (roles: string[]) => [...new Set(roles.map(role =>
        String(role).toUpperCase().replace(/^ROLE_/, ''),
      ))].sort().join(',');
      if (Array.isArray(raw.roles) && rolesKey(raw.roles) !== rolesKey(session.roles)) {
        session = await this.http.post('/api/v1/auth/refresh-roles', {}, { signal });
        if (!session.authenticated || session.userId !== id) {
          throw new Error('Tài khoản vừa thay đổi. Vui lòng tải lại phiên đăng nhập.');
        }
      }
      const email = raw.email || '';
      const fullName = raw.userProfile?.fullName || raw.fullName || raw.name || email.split('@')[0] || 'Người dùng';
      const phone = raw.userProfile?.phoneNumber || raw.phone || raw.phoneNumber || null;
      const avatarUrl = raw.userProfile?.avatarUrl || raw.avatarUrl || null;

      // Chuẩn hóa roles từ backend (ROLE_ADMIN -> ADMIN, ROLE_TICKET_VENDOR -> TICKET_VENDOR, v.v.)
      const rawRolesList: string[] = [];
      if (Array.isArray(session.roles)) rawRolesList.push(...session.roles);
      // Authorization roles come from the same verified session, never a union of snapshots.

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
      let staffAssignments: StaffAssignment[] = [];
      let staffAssignmentError: string | null = null;

      // Nếu là TICKET_VENDOR, lấy thông tin nhà xe
      if (normalizedRoles.includes('TICKET_VENDOR')) {
        try {
          const op = await this.http.get<RawOperatorProfile>('/api/v1/operators/me/profile', { cache: 'no-store', signal });
          if (op && op.id) {
            operatorId = op.id;
            operatorName = op.displayName || op.name;
          }
          if (op?.status && op.status !== 'ACTIVE') {
            throw new Error('Nhà xe đang bị tạm ngừng hoạt động. Vui lòng liên hệ quản trị viên.');
          }
        } catch (error) {
          if (signal?.aborted) throw error;
          // Keep the signed role so the portal can show a specific retryable error.
          // Never treat an unavailable operator profile as a new KYC application.
        }
      }

      // Tự động kiểm tra và đồng bộ phân công nhân viên
      try {
        const res = await this.http.get<any>('/api/v1/staff/me/assignments', { cache: 'no-store', signal });
        const assignments = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];

        if (assignments.length > 0) {
          staffAssignments = assignments.map((a: any): StaffAssignment => {
            const capabilities: StaffCapability[] = [];
            if (a.canSellCash) capabilities.push('SELL_CASH');
            if (a.canCheckIn) capabilities.push('CHECK_IN');
            if (a.canManageTrip) capabilities.push('MANAGE_TRIP');
            if (a.canCloseShift) capabilities.push('CLOSE_SHIFT', 'CASH_VIEW');
            return { operatorId: a.operatorId || a.operator?.id,
              operatorName: a.operator?.name || a.operatorName || 'Nhà xe được phân công',
              capabilities, tripIds: Array.isArray(a.tripIds) ? a.tripIds : [],
              allTrips: !a.tripIds?.length };
          }).filter((a: StaffAssignment) => Boolean(a.operatorId));
          if (!normalizedRoles.includes('STAFF')) {
            normalizedRoles.push('STAFF');
          }
          const first = assignments[0];
          // A vendor's own operator must not be overwritten by a staff assignment.
          if (!operatorId) {
            operatorId = first.operatorId || first.operator?.id || null;
            operatorName = first.operator?.name || null;
          }

          const caps: StaffCapability[] = [];
          const trips: string[] = [];
          let all = false;

          for (const a of assignments.filter((assignment: any) =>
            (assignment.operatorId || assignment.operator?.id) === operatorId,
          )) {
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
      } catch (reason) {
        if (signal?.aborted) throw reason;
        staffAssignmentError = reason instanceof Error ? reason.message : 'Không tải được phân công nhân viên.';
      }

      const confirmed = await this.http.get<{ authenticated: boolean; userId: string; roles: string[] }>('/api/v1/auth/session', { cache: 'no-store', signal });
      if (!confirmed.authenticated || confirmed.userId !== id || rolesKey(confirmed.roles) !== rolesKey(session.roles)) {
        throw new Error('Phiên đăng nhập vừa thay đổi. Vui lòng thử lại để tải đúng tài khoản.');
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
        staffAssignments,
        staffAssignmentError,
      });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) return null;
      throw reason;
    }
  }

  async logout(): Promise<void> {
    await this.http.post('/api/v1/auth/logout');
    this.http.resetSession?.();
  }

  private callbackPath(returnPath?: string): string {
    const safe = safeReturnPath(returnPath);
    return '/auth/callback' + (safe && safe !== '/' ? `?returnTo=${encodeURIComponent(safe)}` : '');
  }

  getLoginUrl(returnPath?: string): string {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3334';
    return buildSsoUrl(currentOrigin, this.callbackPath(returnPath), 'login', import.meta.env.VITE_SSO_URL);
  }

  getRegisterUrl(returnPath?: string): string {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3334';
    return buildSsoUrl(currentOrigin, this.callbackPath(returnPath), 'register', import.meta.env.VITE_SSO_URL);
  }

  getLogoutUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3334';
    const target = new URL('/logout', ssoOrigin(origin, import.meta.env.VITE_SSO_URL));
    target.searchParams.set('redirect_uri', new URL('/?signedOut=1', origin).href);
    return target.href;
  }
}
