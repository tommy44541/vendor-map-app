import { request, ServerSuccessResponse } from './util';

interface RegisterDeviceRequest {
  device_id: string;
  device_type: string;
  device_token: string;
}

interface UpdateDeviceRequest {
  fcm_token: string;
}

interface RegisterDeviceData {
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

interface UpdateDeviceData {
  ID: string;
  FCMToken: string;
  UpdatedAt: string;
}

export type RegisterDeviceResponse = ServerSuccessResponse<RegisterDeviceData>;
export type GetDevicesResponse = ServerSuccessResponse<GetDevicesData[]>;
export type UpdateDeviceResponse = ServerSuccessResponse<UpdateDeviceData>;
export type DeleteDeviceResponse = ServerSuccessResponse<null>;

export const deviceApi = {
  //註冊裝置
  registerDevice: (deviceData: RegisterDeviceRequest) => {
    return request<RegisterDeviceResponse>('/api/v1/devices', {
      body: deviceData,
      requireAuth: true,
      method: 'POST',
    });
  },
  // 向後相容（避免舊呼叫方爆掉）
  registeDevice: (deviceData: RegisterDeviceRequest) => {
    return deviceApi.registerDevice(deviceData);
  },
  //取得裝置列表
  getDevices: () => {
    return request<GetDevicesResponse>('/api/v1/devices', {
      requireAuth: true,
      method: 'GET',
    });
  },
  //更新 FCM Token
  updateDevice: (deviceId: string, deviceData: UpdateDeviceRequest) => {
    return request<UpdateDeviceResponse>(`/api/v1/devices/${deviceId}/token`, {
      body: deviceData,
      requireAuth: true,
      method: 'PUT',
    });
  },
  //刪除裝置
  deleteDevice: (deviceId: string) => {
    return request<DeleteDeviceResponse>(`/api/v1/devices/${deviceId}`, {
      requireAuth: true,
      method: 'DELETE',
    });
  }
};