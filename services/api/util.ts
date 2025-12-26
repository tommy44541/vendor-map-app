import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAccessTokenRefreshed } from './authEvents';

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

// 獲取刷新token
const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('refreshToken');
  } catch (error) {
    console.error('獲取刷新token失敗:', error);
    return null;
  }
};

// 刷新token
const refreshAuthToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      console.error('❌ 沒有找到刷新token');
      return null;
    }

    const url = `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8081'}/auth/refresh`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      console.error('❌ 刷新token失敗:', response.status);
      return null;
    }

    const result = await response.json();
    if (result.success && result.data.access_token) {
      // 保存新的access token
      await AsyncStorage.setItem('authToken', result.data.access_token);
      if (result.data.refresh_token) {
        await AsyncStorage.setItem('refreshToken', result.data.refresh_token);
      }
      console.log('✅ Token刷新成功');
      emitAccessTokenRefreshed(result.data.access_token);
      return result.data.access_token;
    }

    return null;
  } catch (error) {
    console.error('❌ 刷新token時發生錯誤:', error);
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
    console.log('token', token);
    console.log(`🔑 Token 狀態: ${token ? '已找到' : '未找到'}`);
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
      console.log(`✅ 已添加 Authorization header`);
    } else {
      console.error('❌ 需要認證但未找到有效的 access_token');
      throw new Error('需要認證但未找到有效的 access_token');
    }
  }

  const url = `${process.env.EXPO_PUBLIC_API_BASE_URL}${endpoint}`;

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

  // 如果是401錯誤且需要認證，嘗試刷新token
  if (response.status === 401 && requireAuth) {
    console.log('🔄 Token已過期，嘗試刷新...');
    const newToken = await refreshAuthToken();
    
    if (newToken) {
      // 使用新token重新發送請求
      const newHeaders = {
        ...requestHeaders,
        Authorization: `Bearer ${newToken}`,
      };
      
      const newFetchConfig: RequestInit = {
        method,
        headers: newHeaders,
      };
      
      if (body && method !== 'GET') {
        newFetchConfig.body = JSON.stringify(body);
      }
      
      const retryResponse = await fetch(url, newFetchConfig);
      
      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        console.error(`❌ 重試請求後仍失敗: ${retryResponse.status}`, errorText);
        throw new Error(`HTTP error! status: ${retryResponse.status}`, { cause: retryResponse });
      }
      
      const result = await retryResponse.json();
      console.log(`✅ API 響應成功 (使用新token):`, result);
      return result;
    } else {
      console.error('❌ 無法刷新token，需要重新登入');
      throw new Error('Token已過期且無法刷新，請重新登入');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ HTTP 錯誤: ${response.status}`, errorText);
    throw new Error(`HTTP error! status: ${response.status}`, { cause: response });
  }

  const result = await response.json();
  console.log(`✅ API 響應成功:`, result);
  return result;
};
