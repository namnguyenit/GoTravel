import Cookies from "js-cookie";

const getToken = () => Cookies.get("access_token");
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

const toApiError = (payload: unknown, fallbackMessage?: string, fallbackStatus?: number) => {
  if (payload instanceof ApiClientError) return payload;
  if (payload instanceof Error) {
    return new ApiClientError(
      {
        status: fallbackStatus,
        code: payload.name || "API_ERROR",
        message: payload.message,
      },
      fallbackMessage,
    );
  }

  const data = (payload && typeof payload === "object" ? payload : {}) as ApiErrorPayload;
  return new ApiClientError(
    {
      ...data,
      status: data.status || fallbackStatus,
      code: data.code || data.errorCode,
    },
    fallbackMessage,
  );
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return trimTrailingSlash(process.env.NEXT_SERVER_API_URL || DEFAULT_SERVER_API_URL);
  }

  return trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || DEFAULT_BROWSER_API_URL);
};

const buildApiUrl = (endpoint: string) => {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${getApiBaseUrl()}${normalizedEndpoint}`;
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  const isFormData = options.body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }
  
  // Không gửi token Authorization đối với các API public như login, register
  const isPublicEndpoint = (endpoint.startsWith("/v1/auth/") && !endpoint.includes("refresh-roles")) || endpoint.includes(".well-known");
  if (token && !isPublicEndpoint) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers,
  });

  const handleAuthError = (currentToken: string | undefined) => {
    if (typeof window !== "undefined") {
      const domain = window.location.hostname.includes("nonnet123.io.vn") ? ".nonnet123.io.vn" : undefined;
      if (domain) {
        Cookies.remove("access_token", { domain, path: "/" });
      }
      Cookies.remove("access_token", { path: "/" });
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      Cookies.remove("user_roles");
      Cookies.remove("user_info");
      
      const path = window.location.pathname;
      if (path.startsWith("/admin") || path.startsWith("/host")) {
        window.location.href = "/";
      } else {
        // Reload page to show Login button if it had a token before
        if (currentToken) {
          window.location.reload();
        }
      }
    }
  };

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    
    // Xử lý lỗi từ Security Filter hoặc Gateway trả về không có body JSON
    if (res.status === 401) {
      handleAuthError(token);
      throw new ApiClientError({
        success: false,
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại."
      });
    }
    if (res.status === 403) {
      handleAuthError(token);
      throw new ApiClientError({
        success: false,
        status: 403,
        code: "FORBIDDEN",
        message: "Bạn không có quyền truy cập chức năng này."
      });
    }
    
    throw new ApiClientError({
      success: false,
      status: res.status,
      code: "API_ERROR",
      message: text || `API response is not JSON. Status: ${res.status}`
    });
  }

  const json = await res.json();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || json.code === 'AUTH_INVALID_TOKEN' || json.errorCode === 'AUTH_INVALID_TOKEN') {
      handleAuthError(token);
    }
    throw toApiError(json, `API request failed. Status: ${res.status}`, res.status);
  }
  return json;
};

const Api = {
  get: async (endpoint: string) => {
    return await request(endpoint, { method: "GET" });
  },
  post: async (endpoint: string, body: unknown, options: RequestInit = {}) => {
    const isFormData = body instanceof FormData;
    return await request(endpoint, {
      method: "POST",
      body: isFormData ? body : JSON.stringify(body),
      ...options,
      headers: {
        ...options.headers,
      }
    });
  },
  put: async (endpoint: string, body: unknown, options: RequestInit = {}) => {
    const isFormData = body instanceof FormData;
    return await request(endpoint, {
      method: "PUT",
      body: isFormData ? body : JSON.stringify(body),
      ...options,
      headers: {
        ...options.headers,
      }
    });
  },
  delete: async (endpoint: string) => {
    return await request(endpoint, { method: "DELETE" });
  },
  patch: async (endpoint: string, body: unknown, options: RequestInit = {}) => {
    const isFormData = body instanceof FormData;
    return await request(endpoint, {
      method: "PATCH",
      body: isFormData ? body : JSON.stringify(body),
      ...options,
      headers: {
        ...options.headers,
      }
    });
  },
};

export default Api;
