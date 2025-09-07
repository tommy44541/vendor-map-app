import { request } from './shared';
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

// Google OAuth 登入響應類型
export interface GoogleOAuthResponse {
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
      user_profile: {
        user_id: string;
        addresses: any[];
        loyalty_points: number;
        updated_at: string;
      };
      created_at: string;
      updated_at: string;
    };
  };
}

// 登出響應類型
export interface LogoutResponse {
  success: boolean;
  code: number;
  message: string;
  data: null;
}

// 認證相關API
export const authApi = {
  // 健康檢查 - 測試基本連接
  healthCheck: () => request<{ status: string }>('/health', 'GET'),
  
  // 用戶註冊 (消費者)
  registerUser: (userData: {
    name: string;
    email: string;
    password: string;
  }) => request<UserRegisterResponse>('/auth/register/user', 'POST', userData),
  
  // 商家註冊
  registerMerchant: (merchantData: {
    name: string;
    email: string;
    password: string;
    store_name: string;
    business_license: string;
  }) => request<MerchantRegisterResponse>('/auth/register/merchant', 'POST', merchantData),
  
  // 用戶登入
  login: (credentials: { email: string; password: string }) =>
    request<LoginResponse>('/auth/login', 'POST', credentials),
  
  // Google登入
  googleLoginCallback: (id_token: string) =>
    request<GoogleOAuthResponse>('/oauth/google/callback', 'POST', { id_token, state: "optional_state" }),
  
  // 刷新token
  refreshToken: (refreshToken: string) => 
    request<RefreshTokenResponse>('/auth/refresh', 'POST', { refresh_token: refreshToken }),

  // 登出
  logout: (refreshToken: string) => 
    request<LogoutResponse>('/auth/logout', 'POST', { refresh_token: refreshToken }),
  
  // 獲取用戶資訊
  getUserInfo: () => request<GetUserInfoResponse>('/auth/user', 'GET'),
};