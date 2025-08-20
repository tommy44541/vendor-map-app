import { api } from './core';
import { GetUserInfoResponse, LoginResponse, MerchantRegisterResponse, UserRegisterResponse } from './types';

// 認證相關API
export const authApi = {
  // 健康檢查 - 測試基本連接
  healthCheck: () => api.get<{ status: string }>('/health'),
  
  // 用戶註冊 (消費者)
  registerUser: (userData: {
    name: string;
    email: string;
    password: string;
  }) => api.post<UserRegisterResponse>('/auth/register/user', userData),
  
  // 商家註冊
  registerMerchant: (merchantData: {
    name: string;
    email: string;
    password: string;
    store_name: string;
    business_license: string;
  }) => api.post<MerchantRegisterResponse>('/auth/register/merchant', merchantData),
  
  // 用戶登入
  login: (credentials: { email: string; password: string }) =>
    api.post<LoginResponse>('/auth/login', credentials),
  
  // Google登入
  googleLogin: (idToken: string) =>
    api.post('/auth/google', { idToken }),
  
  // 刷新token
  refreshToken: () => api.post('/auth/refresh'),

  // 登出
  logout: () => api.post('/auth/logout'),
  
  // 獲取用戶資訊
  getUserInfo: () => api.get<GetUserInfoResponse>('/auth/user'),
};
