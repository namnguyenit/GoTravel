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
let csrfToken: string | null = null;

const sessionResponse = async (signal?: AbortSignal) => {
  const response = await fetch('/api/v1/auth/session', { credentials: 'include', cache: 'no-store', signal });
  csrfToken = response.headers.get('X-CSRF-Token') || null;
  return response;
};

const post = async (url: string, body: unknown, csrfRetried = false): Promise<any> => {
  const csrf = csrfToken || Cookies.get('csrf_token');
  const res = await fetch(url, {
    method: 'POST', credentials: 'include',
    headers: { ...jsonHeaders, ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    body: JSON.stringify(body)
  });
  csrfToken = res.headers.get('X-CSRF-Token') || csrfToken;
  const data = await res.json();
  if (res.status === 403 && data.code === 'INVALID_CSRF_TOKEN' && !csrfRetried) {
    await sessionResponse();
    return post(url, body, true);
  }
  if (!res.ok || data.success === false || data.status === 'ERROR' || data.errorCode) {
    const err = new Error(data.message || 'Yêu cầu xác thực thất bại');
    (err as Error & { code?: string }).code = data.errorCode || data.code || 'UNAUTHENTICATED';
    throw err;
  }
  return data;
};

export const clearAuthCookie = async (): Promise<void> => {
  // Bootstrap CSRF without reissuing an access cookie, including for expired legacy sessions.
  await sessionResponse();
  await post('/api/v1/auth/logout', {});
  csrfToken = null;
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

  getMe: async (signal?: AbortSignal): Promise<UserProfile | null> => {
    const session = await sessionResponse(signal);
    if (session.status === 401) return null;
    if (!session.ok) throw new Error('Chưa thể kiểm tra phiên đăng nhập. Vui lòng thử lại sau.');
    const sessionData = await session.json();
    const res = await fetch('/api/v1/me', { credentials: 'include', cache: 'no-store', signal });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error('Chưa thể tải thông tin tài khoản. Vui lòng thử lại sau.');
    const data = await res.json();
    if (data.success === false) throw new Error(data.message || 'Chưa thể tải thông tin tài khoản.');
    const profile = data.data || data;
    if (!profile.id && !profile.sub) throw new Error('Máy chủ chưa trả về thông tin tài khoản hợp lệ.');
    if ((profile.id || profile.sub) !== sessionData.data?.userId) throw new Error('Tài khoản vừa thay đổi. Vui lòng tải lại trang.');
    return profile as UserProfile;
  },
};
