import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/env';
import { authApi } from './auth';
import { getUserFriendlyMessage } from './errorHandler';
import { API_SETTINGS, RequestConfig, RequestHeaders, ServerErrorResponse } from './types';

// API基礎配置
const API_SETTINGS_INSTANCE: API_SETTINGS = {
  BASE_URL: API_CONFIG.API_BASE_URL,
  TIMEOUT: API_CONFIG.API_TIMEOUT,
};

// 獲取認證token
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('獲取認證token失敗:', error);
    return null;
  }
};

// 設置認證token
export const setAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('authToken', token);
  } catch (error) {
    console.error('設置認證token失敗:', error);
  }
};

// 設置刷新token
export const setRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('refreshToken', refreshToken);
  } catch (error) {
    console.error('設置刷新token失敗:', error);
  }
};

// 獲取刷新token
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('refreshToken');
  } catch (error) {
    console.error('獲取刷新token失敗:', error);
    return null;
  }
};

// 清除認證token
export const clearAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('authToken');
  } catch (error) {
    console.error('清除認證token失敗:', error);
  }
};

// 清除刷新token
export const clearRefreshToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('refreshToken');
  } catch (error) {
    console.error('清除刷新token失敗:', error);
  }
};

// 構建請求URL
const buildUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  return `${API_SETTINGS_INSTANCE.BASE_URL}${endpoint}`;
};

// 構建請求頭
const buildHeaders = async (customHeaders?: Partial<RequestHeaders>): Promise<Record<string, string>> => {
  const token = await getAuthToken();
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  // 合併自定義headers，過濾掉undefined值
  const mergedHeaders = { ...defaultHeaders };
  if (customHeaders) {
    Object.entries(customHeaders).forEach(([key, value]) => {
      if (value !== undefined) {
        mergedHeaders[key] = value;
      }
    });
  }

  return mergedHeaders;
};

// 處理響應
const handleResponse = async <T>(response: Response, originalRequest?: RequestConfig): Promise<T> => {
  if (!response.ok) {
    if (response.status === 401) {
      // 尝试自动刷新token
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          console.log('🔄 尝试自动刷新token...');
          const refreshResponse = await authApi.refreshToken(refreshToken);
          
          if (refreshResponse.success) {
            // 保存新的token
            await setAuthToken(refreshResponse.data.access_token);
            await setRefreshToken(refreshResponse.data.refresh_token);
            
            console.log('✅ Token自动刷新成功');
            
            // 重新发送原始请求
            if (originalRequest) {
              const retryHeaders = await buildHeaders(originalRequest.headers);
              const retryResponse = await fetch(response.url, {
                method: originalRequest.method,
                headers: retryHeaders,
                body: originalRequest.body
              });
              
              if (retryResponse.ok) {
                return await retryResponse.json();
              }
            }
          }
        } catch (refreshError) {
          console.error('❌ Token自动刷新失败:', refreshError);
          // 刷新失败，清除所有认证信息
          await clearAuthToken();
          await clearRefreshToken();
        }
      }
      
      // 未授權，清除token
      await clearAuthToken();
      throw new Error('認證失敗，請重新登入');
    }
    
    if (response.status === 403) {
      throw new Error('權限不足');
    }
    
    if (response.status >= 500) {
      throw new Error('伺服器錯誤，請稍後重試');
    }
    
    // 嘗試解析錯誤響應
    try {
      const errorData = await response.json();
      
      // 检查是否为标准的服务器错误响应格式
      if (errorData.success === false && errorData.code && errorData.message) {
        // 创建标准化的错误对象
        const serverError: ServerErrorResponse = {
          success: false,
          code: errorData.code,
          message: errorData.message,
          error: errorData.error || { code: 'UNKNOWN_ERROR', details: '' }
        };
        
        // 抛出包含完整错误信息的错误
        const error = new Error(getUserFriendlyMessage(serverError));
        (error as any).serverError = serverError;
        throw error;
      }
      
      // 如果不是标准格式，使用通用错误处理
      throw new Error(errorData.message || errorData.error || `請求失敗: ${response.status}`);
    } catch (parseError) {
      // 如果JSON解析失败，使用HTTP状态码
      const statusMessage = getUserFriendlyMessage({ 
        success: false, 
        code: response.status, 
        message: `HTTP ${response.status}`,
        error: { code: 'HTTP_ERROR', details: response.statusText }
      });
      throw new Error(statusMessage);
    }
  }

  try {
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error('響應資料解析失敗');
  }
};

// 核心請求函數
const request = async <T>(
  endpoint: string,
  config: RequestConfig
): Promise<T> => {
  const url = buildUrl(endpoint);
  const headers = await buildHeaders(config.headers);
  
  console.log('🌐 API請求詳情:', {
    url,
    method: config.method,
    headers,
    body: config.body
  });
  
  const requestConfig: RequestInit = {
    method: config.method,
    headers,
  };

  if (config.body && config.method !== 'GET') {
    requestConfig.body = JSON.stringify(config.body);
  }

  try {
    console.log('📡 開始發送請求到:', url);
    const response = await fetch(url, requestConfig);
    console.log('📥 收到響應:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    return await handleResponse<T>(response, config);
  } catch (error) {
    console.error('❌ 請求失敗:', error);
    console.error('🔍 錯誤詳情:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      url,
      method: config.method
    });
    throw error;
  }
};

// API方法封装
export const api = {
  // GET請求
  get: <T>(endpoint: string, headers?: Partial<RequestHeaders>) =>
    request<T>(endpoint, { method: 'GET', headers }),
  
  // POST請求
  post: <T>(endpoint: string, body?: any, headers?: Partial<RequestHeaders>) =>
    request<T>(endpoint, { method: 'POST', body, headers }),
  
  // PUT請求
  put: <T>(endpoint: string, body?: any, headers?: Partial<RequestHeaders>) =>
    request<T>(endpoint, { method: 'PUT', body, headers }),
  
  // DELETE請求
  delete: <T>(endpoint: string, headers?: Partial<RequestHeaders>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
  
  // PATCH請求
  patch: <T>(endpoint: string, body?: any, headers?: Partial<RequestHeaders>) =>
    request<T>(endpoint, { method: 'PATCH', body, headers }),
};

// 導出API設置
export { API_SETTINGS_INSTANCE as API_SETTINGS };
