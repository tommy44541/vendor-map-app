import { api } from './core';

// 消费者相关API
export const consumerApi = {
  // 获取推荐商家
  getRecommendedVendors: () => api.get('/consumer/recommendations'),
  
  // 搜索商家
  searchVendors: (query: string) => api.get(`/consumer/search?q=${query}`),
  
  // 收藏商家
  favoriteVendor: (vendorId: string) => api.post('/consumer/favorites', { vendorId }),
  
  // 取消收藏商家
  unfavoriteVendor: (vendorId: string) => api.delete(`/consumer/favorites/${vendorId}`),
  
  // 获取收藏的商家列表
  getFavoriteVendors: () => api.get('/consumer/favorites'),
  
  // 获取浏览历史
  getBrowsingHistory: () => api.get('/consumer/history'),
  
  // 清除浏览历史
  clearBrowsingHistory: () => api.delete('/consumer/history'),
  
  // 获取附近商家
  getNearbyVendors: (latitude: number, longitude: number, radius?: number) =>
    api.get(`/consumer/nearby?lat=${latitude}&lng=${longitude}&radius=${radius || 5000}`),
  
  // 获取商家详情
  getVendorDetails: (vendorId: string) => api.get(`/consumer/vendor/${vendorId}`),
  
  // 提交商家评价
  submitVendorReview: (vendorId: string, reviewData: {
    rating: number;
    comment: string;
  }) => api.post(`/consumer/vendor/${vendorId}/review`, reviewData),
  
  // 获取用户订单历史
  getOrderHistory: (params?: any) => api.get('/consumer/orders', params),
  
  // 创建订单
  createOrder: (orderData: any) => api.post('/consumer/orders', orderData),
  
  // 取消订单
  cancelOrder: (orderId: string) => api.put(`/consumer/orders/${orderId}/cancel`),
  
  // 获取订单详情
  getOrderDetails: (orderId: string) => api.get(`/consumer/orders/${orderId}`),
};
