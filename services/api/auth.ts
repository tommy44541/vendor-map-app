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

export type AuthStatus = "authenticated" | "onboarding_required";

export interface AuthResultData {
  status: AuthStatus;
  access_token?: string;
  refresh_token?: string;
  onboarding_token?: string;
  requested_role?: string;
  required_fields?: string[];
  user?: UserData;
}

// Token 資料類型
export interface TokenData {
  access_token: string;
  refresh_token: string;
}



// 響應類型定義
export type UserRegisterResponse = ApiSuccessResponse<AuthResultData>;
export type MerchantRegisterResponse = ApiSuccessResponse<AuthResultData>;
export type LoginResponse = ApiSuccessResponse<AuthResultData>;
export type GetUserInfoResponse = ApiSuccessResponse<UserData>;
export type RefreshTokenResponse = ApiSuccessResponse<TokenData>;
export type GoogleLoginResponse = ApiSuccessResponse<AuthResultData>;
export type CompleteMerchantOnboardingResponse = ApiSuccessResponse<AuthResultData>;

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
  }) => request<AuthResultData>('/auth/register/user', {
    body: userData 
  }),
  
  // 商家註冊
  registerMerchant: (merchantData: {
    name: string;
    email: string;
    password: string;
    store_name: string;
    business_license: string;
  }) => request<AuthResultData>('/auth/register/merchant', {
    body: merchantData 
  }),
  
  // 用戶登入
  login: (credentials: { email: string; password: string }) =>
    request<AuthResultData>('/auth/login', {
      body: credentials,
    }),

  // Google 第三方登入（ID Token 驗證）
  googleLoginCallback: (input: {
    idToken: string;
    requestedRole?: "user" | "merchant";
    state?: "user" | "merchant";
    storeName?: string;
    businessLicense?: string;
  }) =>
    request<AuthResultData>('/oauth/google/callback', {
      body: {
        id_token: input.idToken,
        ...(input.requestedRole ? { requested_role: input.requestedRole } : {}),
        ...(input.state ? { state: input.state } : {}),
        ...(input.storeName ? { store_name: input.storeName } : {}),
        ...(input.businessLicense ? { business_license: input.businessLicense } : {}),
      },
    }),

  completeMerchantOnboarding: (input: {
    onboarding_token: string;
    store_name: string;
    business_license: string;
  }) =>
    request<AuthResultData>('/auth/onboarding/merchant', {
      body: input,
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
