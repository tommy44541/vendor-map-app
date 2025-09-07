import { request } from './shared';

// 商家信息类型
export interface VendorInfo {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string;
  business_license: string;
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


// 获取商家信息响应
export interface GetVendorInfoResponse extends VendorInfo {}

// 更新商家信息响应
export interface UpdateVendorInfoResponse extends VendorInfo {}

// 核心API请求函数


// 商家相关API
export const vendorApi = {
  // 获取商家信息
  getVendorInfo: (vendorId: string) => request<GetVendorInfoResponse>(`/vendor/${vendorId}`, 'GET'),

};