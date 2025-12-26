import { request, ServerSuccessResponse } from './util';

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

export interface PublishLocationNotificationData {
  ID: string;
  MerchantID: string;
  AddressID: string;
  LocationName: string;
  FullAddress: string;
  Latitude: number;
  Longitude: number;
  HintMessage: string;
  TotalSent: number;
  TotalFailed: number;
  Status: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export type PublishLocationNotificationResponse = ServerSuccessResponse<PublishLocationNotificationData>;

export const notificationApi = {
  //發布位置通知（需要商戶角色）
  publishLocationNotification: (
    body:
      | PublishLocationNotificationWithIDRequest
      | PublishLocationNotificationTempLocationRequest
  ) =>
    request<PublishLocationNotificationResponse>('/api/v1/notifications', {
      requireAuth: true,
      method: 'POST',
      body,
    }),
};