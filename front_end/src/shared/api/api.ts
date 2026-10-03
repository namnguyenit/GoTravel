import Cookies from "js-cookie";

const DEFAULT_BROWSER_API_URL = "/api";
const DEFAULT_SERVER_API_URL = "http://localhost:5555/api";

type ApiErrorPayload = {
  success?: boolean;
  status?: number;
  code?: string;
  errorCode?: string;
  message?: string;
  data?: unknown;
};

export class ApiClientError extends Error {
  success = false;
  status: number;
  code: string;
  data?: unknown;

  constructor(payload: ApiErrorPayload, fallbackMessage = "Có lỗi xảy ra khi gọi API.") {
    super(payload.message || fallbackMessage);
    this.name = "ApiClientError";
    this.status = payload.status || 500;
    this.code = payload.code || payload.errorCode || "API_ERROR";
    this.data = payload.data;
  }
}

const getApiBaseUrl = () => typeof window === "undefined"
  ? (process.env.NEXT_SERVER_API_URL || DEFAULT_SERVER_API_URL).replace(/\/+$/, "")
  : (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BROWSER_API_URL).replace(/\/+$/, "");

const buildApiUrl = (endpoint: string) => /^https?:\/\//i.test(endpoint)
  ? endpoint
  : `${getApiBaseUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

const request = async (endpoint: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (typeof window !== "undefined" && !["GET", "HEAD", "OPTIONS"].includes(options.method || "GET")) {
    const csrf = Cookies.get("csrf_token");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const res = await fetch(buildApiUrl(endpoint), { ...options, headers, credentials: "include" });
  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("session_info");
      localStorage.removeItem("user_info");
    }
    throw new ApiClientError({
      ...(payload && typeof payload === "object" ? payload : {}),
      status: res.status,
      message: payload?.message || (res.status === 401
        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        : `API request failed. Status: ${res.status}`)
    });
  }
  if (!payload) throw new ApiClientError({ status: res.status, code: "INVALID_RESPONSE", message: "API response is not JSON." });
  return payload;
};

const Api = {
  get: (endpoint: string) => request(endpoint, { method: "GET" }),
  post: (endpoint: string, body: unknown, options: RequestInit = {}) => request(endpoint, {
    ...options, method: "POST", body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  put: (endpoint: string, body: unknown, options: RequestInit = {}) => request(endpoint, {
    ...options, method: "PUT", body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  delete: (endpoint: string) => request(endpoint, { method: "DELETE" }),
  patch: (endpoint: string, body: unknown, options: RequestInit = {}) => request(endpoint, {
    ...options, method: "PATCH", body: body instanceof FormData ? body : JSON.stringify(body)
  }),
};

export default Api;
