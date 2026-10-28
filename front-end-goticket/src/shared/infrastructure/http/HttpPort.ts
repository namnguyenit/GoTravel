/**
 * HttpPort - Clean Architecture Technical Port & Adapter cho toàn bộ giao tiếp mạng.
 * 
 * Nguyên tắc:
 * 1. Gọi Gateway /api/v1 qua HttpPort với credentials: 'include' (sử dụng HttpOnly cookie).
 * 2. Đính kèm X-CSRF-Token cho các mutation (POST, PUT, PATCH, DELETE).
 * 3. Tuyệt đối không lưu/đọc JWT từ localStorage, không giả lập header X-User-*.
 * 4. Xử lý giải mã envelope response thống nhất (GoCar vs Spring ApiResponse).
 */

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipCsrf?: boolean;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface IHttpClient {
  resetSession?(): void;
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T>;
  patch<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
}

export class FetchHttpClient implements IHttpClient {
  private readonly baseUrl: string;
  private csrfToken: string | null = null;

  constructor(baseUrl = '') {
    // Nếu rỗng, request sẽ là relative path e.g. /api/v1/... (đi qua Vite proxy đến Gateway port 5555)
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private getCsrfTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/) ||
                  document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let fullUrl = `${this.baseUrl}${cleanEndpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
      }
    }
    return fullUrl;
  }

  private async request<T>(endpoint: string, method: string, body?: unknown, config: RequestConfig = {}, csrfRetried = false): Promise<T> {
    const { params, headers: customHeaders, skipCsrf, ...restConfig } = config;
    const url = this.buildUrl(endpoint, params);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((customHeaders as Record<string, string>) || {}),
    };

    // Đính kèm Content-Type nếu có body và không phải FormData
    if (body !== undefined && !(body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Đính kèm CSRF token cho mutations
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    if (isMutation && !skipCsrf) {
      const token = this.csrfToken || this.getCsrfTokenFromCookie();
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }

    const payload = body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        credentials: 'include', // Bắt buộc để gửi cookie HttpOnly session
        headers,
        body: payload,
        ...restConfig,
      });
    } catch (networkError: unknown) {
      const msg = networkError instanceof Error ? networkError.message : 'Lỗi kết nối mạng';
      throw new ApiError(0, `Không thể kết nối đến máy chủ: ${msg}`, 'NETWORK_ERROR');
    }

    // Lưu CSRF token nếu server trả về qua header
    const serverCsrf = response.headers.get('X-CSRF-Token') || response.headers.get('x-csrf-token');
    if (serverCsrf) {
      this.csrfToken = serverCsrf;
    }

    // Xử lý status 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    // Đọc body response
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        json = await response.json();
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      // CSRF rejection occurs before the business handler; retry only this specific rejection once.
      if (response.status === 403 && json?.code === 'INVALID_CSRF_TOKEN' && isMutation && !skipCsrf && !csrfRetried) {
        this.csrfToken = null;
        try {
          await this.request('/api/v1/auth/session', 'GET', undefined, { cache: 'no-store', signal: config.signal }, true);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
        }
        return this.request<T>(endpoint, method, body, config, true);
      }
      let errorMessage = `Yêu cầu thất bại (${response.status})`;
      let errorCode = 'HTTP_ERROR';
      let details: unknown = null;

      if (json && typeof json === 'object') {
        details = json;
        if (json.message) {
          errorMessage = Array.isArray(json.message) ? json.message.join(', ') : String(json.message);
        } else if (json.error) {
          errorMessage = String(json.error);
        }
        if (json.code || json.errorCode) {
          errorCode = String(json.code || json.errorCode);
        }
      }

      throw new ApiError(response.status, errorMessage, errorCode, details);
    }

    // Giải mã Response Envelope thống nhất:
    if (json && typeof json === 'object') {
      // Trường hợp GoCar / GoTravel envelope: { success: true, data: ..., code: ..., message: ... }
      if ('success' in json) {
        if (json.success === false) {
          throw new ApiError(response.status, json.message || 'Thao tác không thành công', json.code || 'BUSINESS_ERROR', json);
        }
        // Some GoCar endpoints carry pagination next to data (not inside it).
        if ('pagination' in json && 'data' in json) return { data: json.data, pagination: json.pagination } as T;
        return (json.data !== undefined ? json.data : json) as T;
      }

      // Trường hợp Spring ApiResponse: { code: 200/1000, message: "...", result: ..., data: ... }
      if ('result' in json && ('code' in json || 'message' in json)) {
        return json.result as T;
      }
      if ('data' in json && ('code' in json || 'message' in json)) {
        return json.data as T;
      }
    }

    return (json !== null ? json : ({} as T)) as T;
  }

  public get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'GET', undefined, config);
  }

  public resetSession(): void { this.csrfToken = null; }

  public post<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'POST', body, config);
  }

  public put<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'PUT', body, config);
  }

  public patch<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'PATCH', body, config);
  }

  public delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'DELETE', undefined, config);
  }
}

// Single Instance HttpClient dùng chung cho toàn bộ ứng dụng
export const httpClient: IHttpClient = new FetchHttpClient(
  import.meta.env.VITE_API_GATEWAY_URL || ''
);
