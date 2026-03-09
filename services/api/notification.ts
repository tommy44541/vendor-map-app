import { ApiSuccessResponse, request } from './util';

export interface PublishLocationNotificationWithIDRequest {
  address_id: string;
  hint_message: string;
}

export interface PublishLocationNotificationTempLocationRequest {
  location_data: {
    location_name: string;
    full_address: string;
    latitude: number;
    longitude: number;
  };
  hint_message: string;
}

// 後端回傳 snake_case（原始結構）
interface RawMerchantLocationNotification {
  id: string;
  merchant_id: string;
  address_id?: string | null;
  location_name: string;
  full_address: string;
  latitude: number;
  longitude: number;
  hint_message: string;
  total_sent: number;
  total_failed: number;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface PublishLocationNotificationData {
  ID: string;
  MerchantID: string;
  AddressID?: string | null;
  LocationName: string;
  FullAddress: string;
  Latitude: number;
  Longitude: number;
  HintMessage: string;
  TotalSent: number;
  TotalFailed: number;
  CreatedAt: string;
  UpdatedAt: string;
  PublishedAt: string;
}

export type PublishLocationNotificationResponse = ApiSuccessResponse<PublishLocationNotificationData>;
export type GetMerchantNotificationHistoryResponse = ApiSuccessResponse<
  PublishLocationNotificationData[]
>;

const toNotification = (
  raw: RawMerchantLocationNotification
): PublishLocationNotificationData => ({
  ID: raw.id,
  MerchantID: raw.merchant_id,
  AddressID: raw.address_id ?? null,
  LocationName: raw.location_name,
  FullAddress: raw.full_address,
  Latitude: raw.latitude,
  Longitude: raw.longitude,
  HintMessage: raw.hint_message,
  TotalSent: raw.total_sent,
  TotalFailed: raw.total_failed,
  CreatedAt: raw.created_at,
  UpdatedAt: raw.updated_at,
  PublishedAt: raw.published_at,
});

export const notificationApi = {
  //發布位置通知（需要商戶角色）
  publishLocationNotification: (
    body:
      | PublishLocationNotificationWithIDRequest
      | PublishLocationNotificationTempLocationRequest
  ) =>
    request<RawMerchantLocationNotification>('/api/v1/notifications', {
      requireAuth: true,
      method: 'POST',
      body,
    }).then((res) => ({ ...res, data: toNotification(res.data) })) as Promise<PublishLocationNotificationResponse>,

  // 取得商戶通知歷史（用於觀察 async worker 更新 total_sent/failed）
  getMerchantNotificationHistory: (params?: { limit?: number; offset?: number }) => {
    const limit = params?.limit;
    const offset = params?.offset;
    const qs = new URLSearchParams();
    if (typeof limit === 'number') qs.set('limit', String(limit));
    if (typeof offset === 'number') qs.set('offset', String(offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';

    return request<RawMerchantLocationNotification[]>(
      `/api/v1/notifications${suffix}`,
      {
        requireAuth: true,
        method: 'GET',
      }
    ).then((res) => ({
      ...res,
      data: Array.isArray(res.data) ? res.data.map(toNotification) : [],
    })) as Promise<GetMerchantNotificationHistoryResponse>;
  },
};