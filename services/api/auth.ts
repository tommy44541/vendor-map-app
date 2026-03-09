import { ApiSuccessResponse, request } from './util';

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



// 響應類型定義
export type UserRegisterResponse = ApiSuccessResponse<UserData>;
export type MerchantRegisterResponse = ApiSuccessResponse<MerchantData>;
export type LoginResponse = ApiSuccessResponse<LoginData>;
export type GetUserInfoResponse = ApiSuccessResponse<UserData>;
export type RefreshTokenResponse = ApiSuccessResponse<TokenData>;
export type GoogleLoginResponse = ApiSuccessResponse<LoginData>;

export type LogoutResponse = ApiSuccessResponse<{ message: string }>;

// 認證相關API
export const authApi = {
  // 健康檢查 - 測試基本連接
  healthCheck: () => request<{ status: string }>('/health', { method: 'GET' }),
  
  // 用戶註冊 (消費者)
  registerUser: (userData: {
    name: string;
    email: string;
    password: string;
  }) => request<UserData>('/auth/register/user', { 
    body: userData 
  }),
  
  // 商家註冊
  registerMerchant: (merchantData: {
    name: string;
    email: string;
    password: string;
    store_name: string;
    business_license: string;
  }) => request<MerchantData>('/auth/register/merchant', { 
    body: merchantData 
  }),
  
  // 用戶登入
  login: (credentials: { email: string; password: string }) =>
    request<LoginData>('/auth/login', { 
      body: credentials,
    }),

  // Google 第三方登入（ID Token 驗證）
  googleLoginCallback: (idToken: string, state?: string) =>
    request<LoginData>('/oauth/google/callback', {
      body: {
        id_token: idToken,
        ...(state ? { state } : {}),
      },
    }),
  

  
  // 刷新token
  refreshToken: (refreshToken: string) => 
    request<TokenData>('/auth/refresh', { 
      body: { refresh_token: refreshToken } 
    }),

  // 登出
  logout: (refreshToken: string) => 
    request<{ message: string }>('/auth/logout', { 
      body: { refresh_token: refreshToken } 
    }),

  // 測試帶權限請求
  testAuth: () => request<any>('/test/auth', { 
    method: 'GET',
    requireAuth: true 
  }),
};
