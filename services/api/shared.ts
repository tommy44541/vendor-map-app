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

// 伺服器錯誤響應類型
export interface ServerErrorResponse {
  success: false;
  code: number;
  message: string;
  error: {
    code: string;
    details: string;
  };
}

// 伺服器成功響應類型
export interface ServerSuccessResponse<T = any> {
  success: true;
  code: number;
  message: string;
  data: T;
}

// 通用API響應類型
export type ApiResponse<T = any> = ServerSuccessResponse<T> | ServerErrorResponse;

// 請求配置類型
export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Partial<RequestHeaders>;
  body?: any;
  timeout?: number;
}

export const request = async <T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  body?: any,
  headers?: Partial<RequestHeaders>
): Promise<T> => {
  // 这里需要导入auth.ts中的request函数，或者重新实现
  // 为了简化，我们假设有一个全局的api对象
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};
