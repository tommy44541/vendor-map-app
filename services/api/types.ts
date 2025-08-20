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

// 錯誤代碼枚舉
export enum ErrorCode {
  // 客戶端錯誤 (4xx)
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  
  // 伺服器錯誤 (5xx)
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// 錯誤代碼常量
export const ERROR_CODES = {
  // 用戶相關錯誤
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  
  // 認證相關錯誤
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // 業務邏輯錯誤
  STORE_ALREADY_EXISTS: 'STORE_ALREADY_EXISTS',
  INVALID_BUSINESS_LICENSE: 'INVALID_BUSINESS_LICENSE',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
} as const;

// 用戶註冊響應類型
export interface UserRegisterResponse {
  id: string;
  email: string;
  name: string;
  user_profile: {
    user_id: string;
    default_shipping_address: string;
    loyalty_points: number;
    updated_at: string;
  };
  merchant_profile: any | null;
  created_at: string;
  updated_at: string;
}

// 商家註冊響應類型
export interface MerchantRegisterResponse {
  id: string;
  email: string;
  name: string;
  user_profile: {
    user_id: string;
    default_shipping_address: string;
    loyalty_points: number;
    updated_at: string;
  };
  merchant_profile: {
    user_id: string;
    store_name: string;
    business_license: string;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
}

// 登入響應類型
export interface LoginResponse {
  success: boolean;
  code: number;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      name: string;
      merchant_profile?: {
        user_id: string;
        addresses: any[];
        store_name: string;
        store_description: string;
        business_license: string;
        updated_at: string;
      };
      created_at: string;
      updated_at: string;
    };
  };
}

// 請求配置類型
export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Partial<RequestHeaders>;
  body?: any;
  timeout?: number;
}

// 獲取用戶信息響應類型
export interface GetUserInfoResponse {
  id: string;
  email: string;
  name: string;
  merchant_profile?: {
    user_id: string;
    addresses: any[];
    store_name: string;
    store_description: string;
    business_license: string;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
}

// 刷新token響應類型
export interface RefreshTokenResponse {
  success: boolean;
  code: number;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
  };
}

// 登出響應類型
export interface LogoutResponse {
  success: boolean;
  code: number;
  message: string;
  data: null;
}
