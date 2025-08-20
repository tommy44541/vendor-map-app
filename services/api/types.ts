// API基础配置
export interface API_SETTINGS {
  BASE_URL: string;
  TIMEOUT: number;
}

// 请求头类型
export interface RequestHeaders {
  'Content-Type': string;
  'Authorization'?: string;
  'Accept': string;
  [key: string]: string | undefined;
}

// 服务器错误响应类型
export interface ServerErrorResponse {
  success: false;
  code: number;
  message: string;
  error: {
    code: string;
    details: string;
  };
}

// 服务器成功响应类型
export interface ServerSuccessResponse<T = any> {
  success: true;
  code: number;
  message: string;
  data: T;
}

// 通用API响应类型
export type ApiResponse<T = any> = ServerSuccessResponse<T> | ServerErrorResponse;

// 错误代码枚举
export enum ErrorCode {
  // 客户端错误 (4xx)
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  
  // 服务器错误 (5xx)
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// 错误代码常量
export const ERROR_CODES = {
  // 用户相关错误
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  
  // 认证相关错误
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // 业务逻辑错误
  STORE_ALREADY_EXISTS: 'STORE_ALREADY_EXISTS',
  INVALID_BUSINESS_LICENSE: 'INVALID_BUSINESS_LICENSE',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
} as const;

// 用户注册响应类型
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

// 商家注册响应类型
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

// 登录响应类型
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

// 请求配置类型
export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Partial<RequestHeaders>;
  body?: any;
  timeout?: number;
}

// 获取用户信息响应类型
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
