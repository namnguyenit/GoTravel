export interface ITokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  clear(): void;
}

const BROADCAST_CHANNEL_NAME = "gotravel_sso_channel";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function getCookieDomain(): string | undefined {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("nonnet123.io.vn")) {
      return ".nonnet123.io.vn";
    }
  }
  return undefined;
}

function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain();
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  let cookieStr = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  if (domain) {
    cookieStr += `; domain=${domain}`;
  }
  if (isSecure) {
    cookieStr += "; Secure";
  }
  document.cookie = cookieStr;

  // Broadcast login event
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: "SSO_LOGIN", timestamp: Date.now() });
      channel.close();
    }
  } catch {}
}

function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  const domain = getCookieDomain();
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  
  let baseCookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  if (isSecure) baseCookie += "; Secure";

  if (domain) {
    document.cookie = `${baseCookie}; domain=${domain}`;
  }
  document.cookie = baseCookie;

  // Broadcast logout event
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: "SSO_LOGOUT", timestamp: Date.now() });
      channel.close();
    }
  } catch {}
}

export class LocalTokenStorage implements ITokenStorage {
  private readonly TOKEN_KEY = "token";

  constructor() {
    // Listen to SSO BroadcastChannel for real-time Single Logout across tabs
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === "SSO_LOGOUT") {
          this.clear();
          window.location.reload();
        } else if (event.data?.type === "SSO_LOGIN") {
          window.location.reload();
        }
      };
    }
  }

  getToken(): string | null {
    // 1. Cookie access_token là Nguồn Chân Lý Duy Nhất (Single Source of Truth)
    const cookieToken = getCookie("access_token");
    if (cookieToken) {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(this.TOKEN_KEY, cookieToken);
      }
      return cookieToken;
    }

    // 2. Nếu cookie đã bị xóa (do GoStay hay Auth Portal logout), đồng bộ xóa luôn localStorage!
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(this.TOKEN_KEY);
    }
    return null;
  }

  setToken(token: string): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
    setCookie("access_token", token, 30);
  }

  clear(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(this.TOKEN_KEY);
    }
    removeCookie("access_token");
  }
}
