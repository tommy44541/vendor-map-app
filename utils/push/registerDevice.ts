import { Platform } from "react-native";
import { deviceApi } from "../../services/api/device";
import { getRegistrationCache, setRegistrationCache } from "./cache";

export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  fcmToken: string;
}

/**
 * idempotent 註冊：
 * - 若已註冊且 token 未變 -> no-op（前端避免重複呼叫）
 * - 若 token 變 -> 重新 POST /devices（後端 upsert）
 */
export async function registerDeviceIfNeeded(input: RegisterDeviceInput) {
  const { userId, deviceId, fcmToken } = input;

  const cache = await getRegistrationCache();
  const shouldCall =
    !cache.device_registered ||
    cache.user_id !== userId ||
    cache.device_id !== deviceId ||
    cache.last_fcm_token !== fcmToken;

  if (!shouldCall) {
    return { didRegister: false, reason: "no-op" as const };
  }

  const res = await deviceApi.registerDevice({
    fcm_token: fcmToken,
    device_id: deviceId,
    platform: Platform.OS === "ios" ? "ios" : "android",
  });

  await setRegistrationCache({
    device_registered: true,
    user_id: userId,
    device_id: deviceId,
    last_fcm_token: fcmToken,
    server_device_id:
      res.data?.ID ||
      (cache.user_id === userId ? cache.server_device_id : null),
    last_registered_at: new Date().toISOString(),
  });

  return { didRegister: true, reason: "registered" as const, data: res.data };
}
