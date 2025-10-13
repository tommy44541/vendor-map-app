import { request, ServerSuccessResponse } from './util';

// 用户位置数据类型
export interface UserLocation {
  ID: string;
  OwnerID: string;
  OwnerType: string;
  Label: string;
  FullAddress: string;
  Latitude: number;
  Longitude: number;
  IsPrimary: boolean;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

// 创建用户位置请求数据类型
export interface CreateUserLocationRequest {
  label: string;
  full_address: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
  is_active: boolean;
}

// 响应类型定义
export type CreateUserLocationResponse = ServerSuccessResponse<UserLocation>;

export const consumerApi = {
  // 创建用户位置
  createUserLocation: (locationData: CreateUserLocationRequest) =>
    request<CreateUserLocationResponse>('/api/v1/locations/user', {
      body: locationData,
      requireAuth: true,
    }),
};