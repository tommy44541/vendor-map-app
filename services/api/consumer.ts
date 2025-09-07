
// 商家信息类型
export interface VendorInfo {
  id: string;
  name: string;
  store_name: string;
  store_description: string;
  business_license: string;
  rating: number;
  review_count: number;
  distance?: number;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FavoriteVendorsResponse {
  vendors: VendorInfo[];
  total: number;
}
// 获取附近商家响应
export interface NearbyVendorsResponse {
  vendors: VendorInfo[];
  total: number;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
}

// 获取订单详情响应
export interface OrderDetailsResponse {}
// 消费者相关API
export const consumerApi = {
  // 获取推荐商家
};