import { Api } from "@/shared/api";
import { ApiClientError } from "@/shared/api/api";
import Cookies from "js-cookie";

type RegisterPayload = {
  username: string;
  password: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  role?: string;
};

type Session = { authenticated: boolean; userId: string; roles: string[]; expiresAt: number };

const rememberSession = (session: Session) => {
  if (typeof window !== "undefined") localStorage.setItem("session_info", JSON.stringify(session));
};

const clearLocalSession = (broadcast = false) => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("session_info");
    localStorage.removeItem("user_info");
    if (broadcast) try {
      const channel = new BroadcastChannel("gotravel_sso_channel");
      channel.postMessage({ type: "SSO_LOGOUT", timestamp: Date.now() });
      channel.close();
    } catch {}
  }
};

const AuthService = {
  login: async (credentials: { username: string; password: string }) => {
    const res = await Api.post("/v1/auth/login", credentials);
    if (res.data?.authenticated) {
      rememberSession(res.data as Session);
      try {
        const profileInfo = await Api.get("/v1/me");
        if (profileInfo?.data) localStorage.setItem("user_info", JSON.stringify(profileInfo.data));
      } catch (err) {
        console.error("Failed to fetch user profile after login", err);
      }
    }
    return res;
  },

  register: (data: RegisterPayload) => Api.post("/v1/auth/register", data),
  forgotPassword: (email: string) => Api.post("/v1/auth/forgot-password", { email }),
  resetPassword: (payload: { email: string; otp: string; newPassword: string }) =>
    Api.post("/v1/auth/reset-password", payload),

  logout: async () => {
    await AuthService.getSession();
    await Api.post("/v1/auth/logout", {});
    clearLocalSession(true);
  },

  getSession: async (): Promise<Session | null> => {
    try {
      const res = await Api.get("/v1/auth/session");
      if (res?.data?.authenticated) {
        rememberSession(res.data as Session);
        return res.data as Session;
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) clearLocalSession();
    }
    return null;
  },

  refreshRoles: async (): Promise<boolean> => {
    try {
      const currentRoles = AuthService.getUserRoles().sort().join(",");
      const res = await Api.post("/v1/auth/refresh-roles", {});
      if (res?.data?.authenticated) {
        rememberSession(res.data as Session);
        try {
          const profileInfo = await Api.get("/v1/me");
          if (profileInfo?.data) localStorage.setItem("user_info", JSON.stringify(profileInfo.data));
        } catch {}
        return currentRoles !== AuthService.getUserRoles().sort().join(",");
      }
    } catch {}
    return false;
  },

  getCurrentUser: () => {
    if (typeof window === "undefined") return null;
    try {
      const user = localStorage.getItem("user_info");
      return user ? JSON.parse(user) : null;
    } catch { return null; }
  },

  fetchCurrentUser: async () => {
    if (!await AuthService.getSession()) return null;
    try {
      const profileInfo = await Api.get("/v1/me");
      if (profileInfo?.data) {
        localStorage.setItem("user_info", JSON.stringify(profileInfo.data));
        return profileInfo.data;
      }
    } catch (err) {
      console.error("Failed to fetch profile with SSO session", err);
    }
    return null;
  },

  getUserRoles: (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      const session = JSON.parse(localStorage.getItem("session_info") || "null") as Session | null;
      if (!session || session.expiresAt * 1000 <= Date.now()) return [];
      return (session.roles || []).map((role) => role.replace(/^ROLE_/, ""));
    } catch { return []; }
  },

  // This readable cookie only hints at UI state; Gateway validates the HttpOnly JWT.
  isAuthenticated: () => typeof window !== "undefined" && !!Cookies.get("csrf_token")
};

export default AuthService;
