import { debugLog } from '@/utils/logger';
import { tokenStorage } from '@/services/auth/tokenStorage';
import { emitAccessTokenRefreshed, emitSessionExpired } from './authEvents';

// API設定
export interface API_SETTINGS {
  BASE_URL: string;
  TIMEOUT: number;
}

// 請求頭類型
export interface RequestHeaders {
  'Content-Type': string;
  'Authorization'?: string;
  'Accept': string;
  [key: string]: string | undefined;
}

// 後端統一回應格式
export interface MetaInfo {
  request_id: string;
}

export interface ApiSuccessResponse<T = any> {
  data: T;
  meta?: MetaInfo;
}

export interface ApiErrorInfo {
  code: string;
  message: string;
  details?: any;
}

export interface ApiErrorResponse {
  error: ApiErrorInfo;
  meta?: MetaInfo;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
  requestId?: string;
  raw?: any;

  constructor(
    message: string,
    opts: {
      status: number;
      code?: string;
      details?: any;
      requestId?: string;
      raw?: any;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
    this.requestId = opts.requestId;
    this.raw = opts.raw;
  }
}

const getApiBaseUrl = (): string => {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    throw new ApiError(
      '缺少 API 設定：請在 .env.local 設定 EXPO_PUBLIC_API_BASE_URL',
      {
        status: 500,
        code: 'CONFIG_MISSING_API_BASE_URL',
      }
    );
  }
  return raw.replace(/\/+$/, '');
};

// 請求配置類型
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Partial<RequestHeaders>;
  body?: any;
  timeout?: number;
  requireAuth?: boolean;
}

const parseBody = async (res: Response): Promise<any> => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// 成功回應：若後端已包 {data, meta} 就直接用；否則包成 {data}
const normalizeSuccess = <T = any>(raw: any): ApiSuccessResponse<T> => {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return raw as ApiSuccessResponse<T>;
  }
  return { data: raw as T };
};

const extractError = (status: number, raw: any): ApiError => {
  const requestId =
    raw && typeof raw === 'object' ? (raw as any)?.meta?.request_id : undefined;

  if (raw && typeof raw === 'object' && 'error' in raw) {
    const info = (raw as any).error as ApiErrorInfo | undefined;
    return new ApiError(info?.message || `HTTP error! status: ${status}`, {
      status,
      code: info?.code,
      details: info?.details,
      requestId,
      raw,
    });
  }

  const msg =
    typeof raw === 'string'
      ? raw
      : raw?.message
        ? String(raw.message)
        : `HTTP error! status: ${status}`;

  return new ApiError(msg, { status, requestId, raw });
};

const getAuthToken = tokenStorage.getAccessToken;
const getRefreshToken = tokenStorage.getRefreshToken;

// 只重試「無法判斷 refresh token 是否真的無效」的失敗(斷網、逾時、後端 5xx),
// 401/403 代表後端已明確判定 refresh token 無效,重試沒有意義、只會浪費時間。
const REFRESH_RETRY_DELAYS_MS = [500, 1500];
const REFRESH_TIMEOUT_MS = 10000;
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

export type RefreshAuthResult =
  | { status: 'refreshed'; accessToken: string }
  | { status: 'invalid' }
  | { status: 'unavailable' };

// Single-flight: 同時間只允許一個 refresh in-flight,並發呼叫共享同一個 promise。
// 避免多個 401 同時觸發多個 refresh,造成 backend re-use detection 把整個 token family 廢掉。
let refreshInFlight: Promise<RefreshAuthResult> | null = null;

type RefreshAttemptResult =
  | { ok: true; accessToken: string }
  | {
      ok: false;
      reason: 'invalid' | 'unavailable';
      retryable: boolean;
    };

const attemptRefreshRequest = async (
  refreshToken: string
): Promise<RefreshAttemptResult> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/auth/refresh`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const isInvalid = response.status === 401 || response.status === 403;
      console.warn('刷新 token 失敗:', response.status);
      return {
        ok: false,
        reason: isInvalid ? 'invalid' : 'unavailable',
        retryable:
          !isInvalid &&
          (response.status >= 500 ||
            response.status === 408 ||
            response.status === 429),
      };
    }

    const result = await parseBody(response);
    const accessToken = result?.data?.access_token;
    if (!accessToken) {
      return { ok: false, reason: 'unavailable', retryable: false };
    }

    await tokenStorage.setAccessToken(accessToken);
    const refresh = result?.data?.refresh_token;
    if (refresh) {
      await tokenStorage.setRefreshToken(refresh);
    }
    debugLog('✅ Token刷新成功');
    emitAccessTokenRefreshed(accessToken);
    return { ok: true, accessToken };
  } catch (error) {
    // fetch 拋出例外(斷網、DNS 失敗、AbortController 逾時)不代表 refresh token 無效,可重試。
    console.warn('刷新 token 時發生暫時性錯誤:', error);
    return { ok: false, reason: 'unavailable', retryable: true };
  } finally {
    clearTimeout(timeoutId);
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const doRefreshAuthToken = async (): Promise<RefreshAuthResult> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    console.warn('沒有找到 refresh token');
    return { status: 'invalid' };
  }

  for (let attempt = 0; ; attempt++) {
    const result = await attemptRefreshRequest(refreshToken);
    if (result.ok) {
      return { status: 'refreshed', accessToken: result.accessToken };
    }
    if (!result.retryable || attempt >= REFRESH_RETRY_DELAYS_MS.length) {
      return { status: result.reason };
    }
    await sleep(REFRESH_RETRY_DELAYS_MS[attempt]);
  }
};

// 匯出給 AuthContext 在 App 回到前景時主動呼叫,趁使用者還沒觸發任何請求前
// 先把 access token 換新,降低「剛回前景、網路還沒穩」時被動刷新失敗的機率。
export const refreshAuthToken = async (): Promise<RefreshAuthResult> => {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = doRefreshAuthToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

const fetchWithTimeout = async (
  url: string,
  config: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...config, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError('連線逾時，請稍後再試', {
        status: 408,
        code: 'REQUEST_TIMEOUT',
        raw: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const requestRaw = async (
  endpoint: string,
  config: RequestConfig
): Promise<Response> => {
  const {
    method = 'POST',
    headers,
    body,
    requireAuth = false,
    timeout = DEFAULT_REQUEST_TIMEOUT_MS,
  } = config;
  const baseUrl = getApiBaseUrl();
  const requestTimeout =
    Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_REQUEST_TIMEOUT_MS;

  debugLog(`🌐 API 請求: ${method} ${endpoint}`);
  debugLog(`🔐 需要認證: ${requireAuth}`);
  
  // 構建請求頭
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers,
  };

  // 如果需要認證，自動添加 Authorization header
  if (requireAuth) {
    const token = await getAuthToken();
    debugLog(`🔑 Token 狀態: ${token ? '已找到' : '未找到'}`);
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
      debugLog(`✅ 已添加 Authorization header`);
    } else {
      console.error('❌ 需要認證但未找到有效的 access_token');
      throw new Error('需要認證但未找到有效的 access_token');
    }
  }

  const url = `${baseUrl}${endpoint}`;

  // 構建 fetch 配置
  const fetchConfig: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // 只有在非 GET 請求時才設置 body
  if (body && method !== 'GET') {
    fetchConfig.body = JSON.stringify(body);
  }

  const response = await fetchWithTimeout(url, fetchConfig, requestTimeout);

  // 如果是401錯誤且需要認證，嘗試刷新token
  if (response.status === 401 && requireAuth) {
    debugLog('🔄 Token已過期，嘗試刷新...');
    const refreshResult = await refreshAuthToken();
    
    if (refreshResult.status === 'refreshed') {
      // 使用新token重新發送請求
      const newHeaders = {
        ...requestHeaders,
        Authorization: `Bearer ${refreshResult.accessToken}`,
      };
      
      const newFetchConfig: RequestInit = {
        method,
        headers: newHeaders,
      };
      
      if (body && method !== 'GET') {
        newFetchConfig.body = JSON.stringify(body);
      }
      
      const retryResponse = await fetchWithTimeout(
        url,
        newFetchConfig,
        requestTimeout
      );
      
      if (!retryResponse.ok) {
        const raw = await parseBody(retryResponse);
        console.error(`❌ 重試請求後仍失敗: ${retryResponse.status}`, raw);
        throw extractError(retryResponse.status, raw);
      }

      debugLog(`✅ API 響應成功 (使用新token): ${method} ${endpoint}`);
      return retryResponse;
    } else if (refreshResult.status === 'invalid') {
      console.warn('refresh token 已失效，需要重新登入');
      emitSessionExpired();
      throw new ApiError('登入已過期，請重新登入', {
        status: 401,
        code: 'TOKEN_EXPIRED',
      });
    }

    throw new ApiError('暫時無法更新登入狀態，請稍後再試', {
      status: 503,
      code: 'TOKEN_REFRESH_UNAVAILABLE',
    });
  }

  if (!response.ok) {
    const raw = await parseBody(response);
    console.error(`❌ HTTP 錯誤: ${response.status}`, raw);
    throw extractError(response.status, raw);
  }

  debugLog(`✅ API 響應成功: ${method} ${endpoint}`);
  return response;
};

// 簡潔的請求函數
export const request = async <T>(
  endpoint: string,
  config: RequestConfig
): Promise<ApiSuccessResponse<T>> => {
  const response = await requestRaw(endpoint, config);
  const result = await parseBody(response);
  debugLog(`✅ API 響應成功:`, result);
  return normalizeSuccess<T>(result);
};
