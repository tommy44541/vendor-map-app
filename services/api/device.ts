import { ApiSuccessResponse, request } from './util';

interface RegisterDeviceRequest {
  fcm_token: string;
  device_id: string;
  platform: 'ios' | 'android';
}

interface UpdateDeviceRequest {
  fcm_token: string;
}

// 後端回傳 snake_case（原始結構）
interface RawUserDevice {
  id: string;
  user_id: string;
  fcm_token: string;
  device_id: string;
  platform: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const toDevice = (raw: RawUserDevice): GetDevicesData => ({
  ID: raw.id,
  UserID: raw.user_id,
  FCMToken: raw.fcm_token,
  DeviceID: raw.device_id,
  Platform: raw.platform,
  IsActive: raw.is_active,
  CreatedAt: raw.created_at,
  UpdatedAt: raw.updated_at,
});

export interface RegisterDeviceData {
  ID: string;
  UserID: string;
  FCMToken: string;
  DeviceID: string;
  Platform: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface GetDevicesData {
  ID: string;
  UserID: string;
  FCMToken: string;
  DeviceID: string;
  Platform: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export type RegisterDeviceResponse = ApiSuccessResponse<RegisterDeviceData>;
export type GetDevicesResponse = ApiSuccessResponse<GetDevicesData[]>;
export type UpdateDeviceResponse = ApiSuccessResponse<{ message: string }>;
export type DeleteDeviceResponse = ApiSuccessResponse<{ message: string }>;

export const deviceApi = {
  //註冊裝置
  registerDevice: async (deviceData: RegisterDeviceRequest) => {
    const res = await request<RawUserDevice>('/api/v1/devices', {
      body: deviceData,
      requireAuth: true,
      method: 'POST',
    });
    return { ...res, data: toDevice(res.data) } as RegisterDeviceResponse;
  },
  // 向後相容（避免舊呼叫方爆掉）
  registeDevice: (deviceData: RegisterDeviceRequest) => {
    return deviceApi.registerDevice(deviceData);
  },
  //取得裝置列表
  getDevices: async () => {
    const res = await request<RawUserDevice[]>('/api/v1/devices', {
      requireAuth: true,
      method: 'GET',
    });
    const data = Array.isArray(res.data) ? res.data.map(toDevice) : [];
    return { ...res, data } as GetDevicesResponse;
  },
  //更新 FCM Token
  updateDevice: (deviceId: string, deviceData: UpdateDeviceRequest) => {
    return request<{ message: string }>(`/api/v1/devices/${deviceId}/token`, {
      body: deviceData,
      requireAuth: true,
      method: 'PUT',
    }) as Promise<UpdateDeviceResponse>;
  },
  //刪除裝置
  deleteDevice: (deviceId: string) => {
    return request<{ message: string }>(`/api/v1/devices/${deviceId}`, {
      requireAuth: true,
      method: 'DELETE',
    }) as Promise<DeleteDeviceResponse>;
  }
};