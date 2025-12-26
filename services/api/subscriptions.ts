import { request, ServerSuccessResponse } from './util';

interface SubscribeMerchantRequest {
  merchant_id: string;
  device_info: {
    fcm_token: string;
    device_id: string;
    platform: string;
  }
}

interface GenerateSubscriptionQRCodeRequest {
  qr_data: {
    merchant_id: string;
  },
  device_info: {
    fcm_token: string;
    device_id: string;
    platform: string;
  }
}

interface SubscribeMerchantData {
  ID: string;
  UserID: string;
  MerchantID: string;
  NotificationRadius: number;
  Status: string;
  CreatedAt: string;
  UpdatedAt: string;
}

interface UnsubscribeMerchantData {
  message: string;
}

interface GetSubscriptionsData {
  ID: string;
  UserID: string;
  MerchantID: string;
  NotificationRadius: number;
  Status: string;
  CreatedAt: string;
  UpdatedAt: string;
}

interface GenerateSubscriptionQRCodeData {
  ID: string;
  UserID: string;
  MerchantID: string;
  NotificationRadius: number;
  Status: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export type SubscribeMerchantResponse = ServerSuccessResponse<SubscribeMerchantData>;
export type UnsubscribeMerchantResponse = ServerSuccessResponse<UnsubscribeMerchantData>;
export type GetSubscriptionsResponse = ServerSuccessResponse<GetSubscriptionsData>;
export type GenerateSubscriptionQRCodeResponse = ServerSuccessResponse<GenerateSubscriptionQRCodeData>;

export const subscriptionsApi = {
  // 訂閱商戶
  subscribeMerchant: (body: SubscribeMerchantRequest) => {
    request<SubscribeMerchantResponse>('/api/v1/subscriptions/merchant', {
      requireAuth: true,
      method: 'POST',
      body,
    })
  },
  //取消訂閱商戶
  unsubscribeMerchant: (merchantId: string) => {
    request<UnsubscribeMerchantResponse>(`/api/v1/subscriptions/merchant/${merchantId}`, {
      requireAuth: true,
      method: 'DELETE',
    })
  },
  //取得訂閱列表
  getSubscriptions: () => {
    request<GetSubscriptionsResponse>(`/api/v1/subscriptions/merchant`, {
      requireAuth: true,
      method: 'GET',
    })
  },
  //生成訂閱 QR Code（需要商戶角色）
  generateSubscriptionQRCode: (body: GenerateSubscriptionQRCodeRequest) => {
    request<GenerateSubscriptionQRCodeResponse>('/api/v1/subscriptions/qr', {
      requireAuth: true,
      method: 'POST',
      body,
    })
  },
};