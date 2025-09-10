import { request, ServerSuccessResponse } from './util';

// 用戶資料類型
export interface UserData {
  id: string;
  email: string;
  name: string;
  user_profile: {
    user_id: string;
    default_shipping_address: string;
    loyalty_points: number;
    updated_at: string;
  };
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

// 商家資料類型
export interface MerchantData {
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

// 登入資料類型
export interface LoginData {
  access_token: string;
  refresh_token: string;
  user: UserData;
}

// Token 資料類型
export interface TokenData {
  access_token: string;
  refresh_token: string;
}

// Google OAuth 用戶資料類型
export interface GoogleUserData {
  id: string;
  email: string;
  name: string;
  user_profile: {
    user_id: string;
    addresses: any[];
    loyalty_points: number;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
}

// Google OAuth 登入資料類型
export interface GoogleLoginData {
  access_token: string;
  refresh_token: string;
  user: GoogleUserData;
}

// 響應類型定義
export type UserRegisterResponse = ServerSuccessResponse<UserData>;
export type MerchantRegisterResponse = ServerSuccessResponse<MerchantData>;
export type LoginResponse = ServerSuccessResponse<LoginData>;
export type GetUserInfoResponse = ServerSuccessResponse<UserData>;
export type RefreshTokenResponse = ServerSuccessResponse<TokenData>;
export type GoogleOAuthResponse = ServerSuccessResponse<GoogleLoginData>;
export type LogoutResponse = ServerSuccessResponse<null>;

// 認證相關API
export const authApi = {
  // 健康檢查 - 測試基本連接
  healthCheck: () => request<{ status: string }>('/health', { method: 'GET' }),
  
  // 用戶註冊 (消費者)
  registerUser: (userData: {
    name: string;
    email: string;
    password: string;
  }) => request<UserRegisterResponse>('/auth/register/user', { 
    body: userData 
  }),
  
  // 商家註冊
  registerMerchant: (merchantData: {
    name: string;
    email: string;
    password: string;
    store_name: string;
    business_license: string;
  }) => request<MerchantRegisterResponse>('/auth/register/merchant', { 
    body: merchantData 
  }),
  
  // 用戶登入
  login: (credentials: { email: string; password: string }) =>
    request<LoginResponse>('/auth/login', { 
      body: credentials,
    }),
  
  // Google登入
  googleLoginCallback: (id_token: string) =>
    request<GoogleOAuthResponse>('/oauth/google/callback', { 
      body: { id_token, state: "optional_state" } 
    }),
  
  // 刷新token
  refreshToken: (refreshToken: string) => 
    request<RefreshTokenResponse>('/auth/refresh', { 
      body: { refresh_token: refreshToken } 
    }),

  // 登出
  logout: (refreshToken: string) => 
    request<LogoutResponse>('/auth/logout', { 
      body: { refresh_token: refreshToken } 
    }),

  // 測試帶權限請求
  testAuth: () => request<any>('/test/auth', { 
    method: 'GET',
    requireAuth: true 
  }),
};