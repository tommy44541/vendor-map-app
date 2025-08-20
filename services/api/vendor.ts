import { api } from './core';

// 商家相关API
export const vendorApi = {
  // 获取商家信息
  getVendorInfo: (vendorId: string) => api.get(`/vendor/${vendorId}`),
  
  // 更新商家信息
  updateVendorInfo: (vendorId: string, data: any) =>
    api.put(`/vendor/${vendorId}`, data),
  
  // 获取商家列表
  getVendorList: (params?: any) => api.get('/vendor/list', params),
  
  // 创建商家
  createVendor: (vendorData: any) => api.post('/vendor', vendorData),
  
  // 删除商家
  deleteVendor: (vendorId: string) => api.delete(`/vendor/${vendorId}`),
  
  // 获取商家菜单
  getVendorMenu: (vendorId: string) => api.get(`/vendor/${vendorId}/menu`),
  
  // 更新商家菜单
  updateVendorMenu: (vendorId: string, menuData: any) =>
    api.put(`/vendor/${vendorId}/menu`, menuData),
  
  // 获取商家营业时间
  getBusinessHours: (vendorId: string) => api.get(`/vendor/${vendorId}/hours`),
  
  // 更新商家营业时间
  updateBusinessHours: (vendorId: string, hoursData: any) =>
    api.put(`/vendor/${vendorId}/hours`, hoursData),
  
  // 获取商家评价
  getVendorReviews: (vendorId: string, params?: any) =>
    api.get(`/vendor/${vendorId}/reviews`, params),
  
  // 商家上传图片
  uploadVendorImage: (vendorId: string, formData: FormData) =>
    api.post(`/vendor/${vendorId}/images`, formData),
};
