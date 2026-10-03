import Cookies from 'js-cookie';

export interface UserProfile {
  id?: string;
  sub?: string;
  username: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  roles?: string[];
  scope?: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  role?: string;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

const post = async (url: string, body: unknown) => {
  const csrf = Cookies.get('csrf_token');
  const res = await fetch(url, {
    method: 'POST', credentials: 'include',
    headers: { ...jsonHeaders, ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok || data.status === 'ERROR' || data.errorCode) {
    const err = new Error(data.message || 'Yêu cầu xác thực thất bại');
    (err as Error & { code?: string }).code = data.errorCode || data.code || 'UNAUTHENTICATED';
    throw err;
  }
  return data;
};

export const clearAuthCookie = async (): Promise<void> => {
  // Migrates any still-valid legacy JavaScript cookie to a protected session first.
  await fetch('/api/v1/auth/session', { credentials: 'include' });
  await post('/api/v1/auth/logout', {});
  try {
    const channel = new BroadcastChannel('gotravel_sso_channel');
    channel.postMessage({ type: 'SSO_LOGOUT', timestamp: Date.now() });
    channel.close();
  } catch {}
};

export const AuthService = {
  login: async (credentials: { username: string; password: string }) => {
    const data = await post('/api/v1/auth/login', credentials);
    if (!data.data?.authenticated) throw new Error('Không thể tạo phiên đăng nhập');
    return data;
  },

  register: (payload: RegisterPayload) =>
    post('/api/v1/auth/register', { ...payload, role: payload.role || 'USER' }),

  forgotPassword: (email: string) => post('/api/v1/auth/forgot-password', { email }),

  resetPassword: (payload: { email: string; otp: string; newPassword: string }) =>
    post('/api/v1/auth/reset-password', payload),

  getMe: async (): Promise<UserProfile | null> => {
    try {
      const session = await fetch('/api/v1/auth/session', { credentials: 'include' });
      if (!session.ok) return null;
      const res = await fetch('/api/v1/me', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return (data.data || data) as UserProfile;
    } catch { return null; }
  },
};
