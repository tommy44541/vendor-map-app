import { request, ServerSuccessResponse } from './util';

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
}


// 响应类型定义
export type CreateMerchantLocationResponse = ServerSuccessResponse<MerchantLocation>;
export type GetMerchantLocationsResponse = ServerSuccessResponse<MerchantLocation[]>;
export type UpdateMerchantLocationResponse = ServerSuccessResponse<UpdateMerchantLocation>;
export type DeleteMerchantLocationResponse = ServerSuccessResponse<null>;

export const merchantApi = {
  // 创建用户位置
  createMerchantLocation: async (locationData: CreateMerchantLocationRequest) => {
    const res = await request<ServerSuccessResponse<RawMerchantLocation>>(
      '/api/v1/locations/merchant',
      {
        body: locationData,
        requireAuth: true,
      }
    );
    if (res?.success) {
      return { ...res, data: toMerchantLocation(res.data) } as CreateMerchantLocationResponse;
    }
    return res as unknown as CreateMerchantLocationResponse;
  },

  //取得用戶位置列表
  getMerchantLocations: async () => {
    const res = await request<ServerSuccessResponse<RawMerchantLocation[]>>(
      '/api/v1/locations/merchant',
      {
        requireAuth: true,
        method: 'GET',
      }
    );
    if (res?.success) {
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
    }
    return res as unknown as GetMerchantLocationsResponse;
  },
  //更新用戶位置
  updateMerchantLocation: async (
    locationId: string,
    locationData: UpdateMerchantLocationRequest
  ) => {
    const res = await request<ServerSuccessResponse<RawUpdateMerchantLocation>>(
      `/api/v1/locations/merchant/${locationId}`,
      {
        body: locationData,
        requireAuth: true,
        method: 'PUT',
      }
    );
    if (res?.success) {
      return { ...res, data: toUpdateMerchantLocation(res.data) } as UpdateMerchantLocationResponse;
    }
    return res as unknown as UpdateMerchantLocationResponse;
  },
  //刪除用戶位置
  deleteMerchantLocation: (locationId: string) =>
    request<DeleteMerchantLocationResponse>(`/api/v1/locations/merchant/${locationId}`, {
      requireAuth: true,
      method: 'DELETE',
    }),
};