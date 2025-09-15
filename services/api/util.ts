import AsyncStorage from '@react-native-async-storage/async-storage';

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

// 基礎響應接口
export interface BaseResponse {
  success: boolean;
  code: number;
  message: string;
}

// 伺服器錯誤響應類型
export interface ServerErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: string;
    details: string;
  };
}

// 伺服器成功響應類型
export interface ServerSuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
}

// 通用API響應類型
export type ApiResponse<T = any> = ServerSuccessResponse<T> | ServerErrorResponse;

// 請求配置類型
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Partial<RequestHeaders>;
  body?: any;
  timeout?: number;
  requireAuth?: boolean;
}

// 獲取認證token
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('獲取認證token失敗:', error);
    return null;
  }
};

// 簡潔的請求函數
export const request = async <T>(
  endpoint: string,
  config: RequestConfig
): Promise<T> => {
  const { method = 'POST', headers, body, requireAuth = false } = config;
  
  console.log(`🌐 API 請求: ${method} ${endpoint}`);
  console.log(`🔐 需要認證: ${requireAuth}`);
  
  // 構建請求頭
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers,
  };

  // 如果需要認證，自動添加 Authorization header
  if (requireAuth) {
    const token = await getAuthToken();
    console.log(`🔑 Token 狀態: ${token ? '已找到' : '未找到'}`);
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
      console.log(`✅ 已添加 Authorization header`);
    } else {
      console.error('❌ 需要認證但未找到有效的 access_token');
      throw new Error('需要認證但未找到有效的 access_token');
    }
  }

  const url = `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8081'}${endpoint}`;

  // 構建 fetch 配置
  const fetchConfig: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // 只有在非 GET 請求時才設置 body
  if (body && method !== 'GET') {
    fetchConfig.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchConfig);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ HTTP 錯誤: ${response.status}`, errorText);
    throw new Error(`HTTP error! status: ${response.status}`, { cause: response });
  }

  const result = await response.json();
  console.log(`✅ API 響應成功:`, result);
  return result;
};
