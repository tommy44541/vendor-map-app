import { api } from './core';

// 用戶相關API
export const userApi = {
  // 更新用戶訊息
  updateProfile: (userData: any) => api.put('/user/profile', userData),
  
  // 上傳頭像
  uploadAvatar: (formData: FormData) => api.post('/user/avatar', formData),
  
  // 獲取用戶資料
  getProfile: () => api.get('/user/profile'),
  
  // 刪除用戶帳戶
  deleteAccount: () => api.delete('/user/account'),
  
  // 更改密碼
  changePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => api.put('/user/password', passwordData),
};
