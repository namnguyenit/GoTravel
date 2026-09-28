import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

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

const BROADCAST_CHANNEL_NAME = "gotravel_sso_channel";

export const getCookieDomain = (): string | undefined => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("nonnet123.io.vn")) {
      return ".nonnet123.io.vn";
    }
  }
  return undefined;
};

export const setAuthCookie = (token: string, days = 30): void => {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain();
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";

  const options: Cookies.CookieAttributes = {
    expires: days,
    path: "/",
    sameSite: "Lax",
    secure: isSecure,
  };

  if (domain) {
    options.domain = domain;
  }

  Cookies.set("access_token", token, options);

  // Broadcast login event to other tabs/subdomains
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: "SSO_LOGIN", token, timestamp: Date.now() });
      channel.close();
    }
  } catch (err) {
    console.debug("BroadcastChannel not supported or error", err);
  }
};

export const clearAuthCookie = (): void => {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain();
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";

  const options: Cookies.CookieAttributes = {
    path: "/",
    sameSite: "Lax",
    secure: isSecure,
  };

  if (domain) {
    Cookies.remove("access_token", { ...options, domain });
    // Fallback explicit document.cookie expiration for tricky browsers
    let cookieStr = `access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}; SameSite=Lax`;
    if (isSecure) cookieStr += "; Secure";
    document.cookie = cookieStr;
  }

  Cookies.remove("access_token", options);
  let localCookieStr = `access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  if (isSecure) localCookieStr += "; Secure";
  document.cookie = localCookieStr;

  // Broadcast single-logout (SLO) signal to all open tabs in real-time
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: "SSO_LOGOUT", timestamp: Date.now() });
      channel.close();
    }
  } catch (err) {
    console.debug("BroadcastChannel error", err);
  }
};

export const getAuthToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const token = Cookies.get("access_token");
  if (token) return token;

  // Fallback regex in case js-cookie misses sub-domain cookies
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (!decoded.exp) return true;
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const AuthService = {
  login: async (credentials: { username: string; password: string }) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();
    if (!res.ok || data.status === "ERROR" || data.errorCode) {
      const err = new Error(data.message || "Tên đăng nhập hoặc mật khẩu không chính xác");
      (err as unknown as { code?: string }).code = data.errorCode || "UNAUTHENTICATED";
      throw err;
    }

    const token = data.data?.token || data.token;
    if (!token) {
      throw new Error("Không nhận được mã xác thực (Token) từ hệ thống");
    }

    setAuthCookie(token, 30);
    return data;
  },

  register: async (payload: RegisterPayload) => {
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, role: payload.role || "USER" }),
    });

    const data = await res.json();
    if (!res.ok || data.status === "ERROR" || data.errorCode) {
      const err = new Error(data.message || "Đăng ký không thành công");
      (err as unknown as { code?: string }).code = data.errorCode || "REGISTRATION_FAILED";
      throw err;
    }

    return data;
  },

  forgotPassword: async (email: string) => {
    const res = await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok || data.status === "ERROR") {
      throw new Error(data.message || "Không thể gửi yêu cầu đặt lại mật khẩu");
    }
    return data;
  },

  resetPassword: async (payload: { email: string; otp: string; newPassword: string }) => {
    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.status === "ERROR") {
      throw new Error(data.message || "Đặt lại mật khẩu không thành công");
    }
    return data;
  },

  getMe: async (): Promise<UserProfile | null> => {
    const token = getAuthToken();
    if (!token || !isTokenValid(token)) return null;

    try {
      const res = await fetch("/api/v1/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearAuthCookie();
        }
        return null;
      }

      const data = await res.json();
      return (data.data || data) as UserProfile;
    } catch {
      return null;
    }
  },
};
