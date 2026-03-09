import { ApiSuccessResponse, request } from './util';

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

export interface UpdateUserLocation {
  ID: string;
  Label: string;
  IsActive: boolean;
  IsPrimary: boolean;
  UpdatedAt: string;
}

// 後端回傳 snake_case（原始結構）
interface RawUserLocation {
  id: string;
  owner_id: string;
  owner_type: string;
  label: string;
  full_address: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RawUpdateUserLocation {
  id: string;
  label: string;
  is_active: boolean;
  is_primary: boolean;
  updated_at: string;
}

const toUserLocation = (raw: RawUserLocation): UserLocation => ({
  ID: raw.id,
  OwnerID: raw.owner_id,
  OwnerType: raw.owner_type,
  Label: raw.label,
  FullAddress: raw.full_address,
  Latitude: raw.latitude,
  Longitude: raw.longitude,
  IsPrimary: raw.is_primary,
  IsActive: raw.is_active,
  CreatedAt: raw.created_at,
  UpdatedAt: raw.updated_at,
});

const toUpdateUserLocation = (raw: RawUpdateUserLocation): UpdateUserLocation => ({
  ID: raw.id,
  Label: raw.label,
  IsActive: raw.is_active,
  IsPrimary: raw.is_primary,
  UpdatedAt: raw.updated_at,
});

// 创建用户位置请求数据类型
export interface CreateUserLocationRequest {
  label: string;
  full_address: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
  is_active: boolean;
}

// 列表回傳已由 UserLocation[] 表示，不需再額外定義單筆結構
export interface UpdateUserLocationRequest {
 label: string;
 is_active: boolean;
 is_primary: boolean;
}


// 响应类型定义
export type CreateUserLocationResponse = ApiSuccessResponse<UserLocation>;
export type GetUserLocationsResponse = ApiSuccessResponse<UserLocation[]>;
export type UpdateUserLocationResponse = ApiSuccessResponse<UpdateUserLocation>;
export type DeleteUserLocationResponse = ApiSuccessResponse<{ message: string }>;

export const consumerApi = {
  // 创建用户位置
  createUserLocation: async (locationData: CreateUserLocationRequest) => {
    const res = await request<RawUserLocation>(
      '/api/v1/locations/user',
      {
        body: locationData,
        requireAuth: true,
      }
    );
    return { ...res, data: toUserLocation(res.data) } as CreateUserLocationResponse;
  },

  //取得用戶位置列表
  getUserLocations: async () => {
    const res = await request<RawUserLocation[]>(
      '/api/v1/locations/user',
      {
        requireAuth: true,
        method: 'GET',
      }
    );
    const toTime = (v?: string) => {
      const t = Date.parse(v ?? '');
      return Number.isFinite(t) ? t : 0;
    };

    const data = Array.isArray(res.data)
      ? res.data
          .map(toUserLocation)
          .sort((a, b) => {
            // IsPrimary 永遠排最前
            if (a.IsPrimary !== b.IsPrimary) return a.IsPrimary ? -1 : 1;
            // UpdatedAt 越晚越前
            const diff = toTime(b.UpdatedAt) - toTime(a.UpdatedAt);
            if (diff !== 0) return diff;
            // 同時間的穩定排序（避免不同 JS 引擎下順序抖動）
            return (a.ID ?? '').localeCompare(b.ID ?? '');
          })
      : [];
    return { ...res, data } as GetUserLocationsResponse;
  },
  //更新用戶位置
  updateUserLocation: async (locationId: string, locationData: UpdateUserLocationRequest) => {
    const res = await request<RawUpdateUserLocation>(
      `/api/v1/locations/user/${locationId}`,
      {
        body: locationData,
        requireAuth: true,
        method: 'PUT',
      }
    );
    return { ...res, data: toUpdateUserLocation(res.data) } as UpdateUserLocationResponse;
  },
  //刪除用戶位置
  deleteUserLocation: (locationId: string) =>
    request<{ message: string }>(`/api/v1/locations/user/${locationId}`, {
      requireAuth: true,
      method: 'DELETE',
    }) as Promise<DeleteUserLocationResponse>,
};