import { ApiSuccessResponse, request } from './util';

// 用户位置数据类型
export interface MerchantLocation {
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

export interface UpdateMerchantLocation {
  ID: string;
  Label: string;
  IsActive: boolean;
  IsPrimary: boolean;
  UpdatedAt: string;
}

// 後端回傳 snake_case（原始結構）
interface RawMerchantLocation {
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

interface RawUpdateMerchantLocation {
  id: string;
  label: string;
  is_active: boolean;
  is_primary: boolean;
  updated_at: string;
}

const toMerchantLocation = (raw: RawMerchantLocation): MerchantLocation => ({
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

const toUpdateMerchantLocation = (
  raw: RawUpdateMerchantLocation
): UpdateMerchantLocation => ({
  ID: raw.id,
  Label: raw.label,
  IsActive: raw.is_active,
  IsPrimary: raw.is_primary,
  UpdatedAt: raw.updated_at,
});

// 创建用户位置请求数据类型
export interface CreateMerchantLocationRequest {
  label: string;
  full_address: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
  is_active: boolean;
}

export interface UpdateMerchantLocationRequest {
  label: string;
  is_active: boolean;
  is_primary: boolean;
}


// 响应类型定义
export type CreateMerchantLocationResponse = ApiSuccessResponse<MerchantLocation>;
export type GetMerchantLocationsResponse = ApiSuccessResponse<MerchantLocation[]>;
export type UpdateMerchantLocationResponse = ApiSuccessResponse<UpdateMerchantLocation>;
export type DeleteMerchantLocationResponse = ApiSuccessResponse<{ message: string }>;

export const merchantApi = {
  // 创建用户位置
  createMerchantLocation: async (locationData: CreateMerchantLocationRequest) => {
    const res = await request<RawMerchantLocation>(
      '/api/v1/locations/merchant',
      {
        body: locationData,
        requireAuth: true,
      }
    );
    return { ...res, data: toMerchantLocation(res.data) } as CreateMerchantLocationResponse;
  },

  //取得用戶位置列表
  getMerchantLocations: async () => {
    const res = await request<RawMerchantLocation[]>(
      '/api/v1/locations/merchant',
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
          .map(toMerchantLocation)
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
    return { ...res, data } as GetMerchantLocationsResponse;
  },
  //更新用戶位置
  updateMerchantLocation: async (
    locationId: string,
    locationData: UpdateMerchantLocationRequest
  ) => {
    const res = await request<RawUpdateMerchantLocation>(
      `/api/v1/locations/merchant/${locationId}`,
      {
        body: locationData,
        requireAuth: true,
        method: 'PUT',
      }
    );
    return { ...res, data: toUpdateMerchantLocation(res.data) } as UpdateMerchantLocationResponse;
  },
  //刪除用戶位置
  deleteMerchantLocation: (locationId: string) =>
    request<{ message: string }>(`/api/v1/locations/merchant/${locationId}`, {
      requireAuth: true,
      method: 'DELETE',
    }) as Promise<DeleteMerchantLocationResponse>,
};