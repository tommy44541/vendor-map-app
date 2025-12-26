import { getStableDeviceId } from "./getDeviceId";
import { getFcmTokenOrNull } from "./getFcmToken";
import { getPushPermissionStatus, requestPushPermission } from "./permission";
import { getRegistrationCache, setRegistrationCache } from "./cache";
import { registerDeviceIfNeeded } from "./registerDevice";
import { startPushTokenRefreshListener } from "./tokenRefresh";
import { deactivateCurrentDeviceOnLogout } from "./deactivateOnLogout";

export interface OnUserAuthenticatedOptions {
  /**
   * 是否在需要時主動 request permission。
   * 依規格：登入後可做 UX 引導並請求；此處預設 true。
   */
  requestPermissionIfNeeded?: boolean;
}

/**
 * 依規格：登入成功 / token refresh success / session restore success 後呼叫。
 * - 不在 App Launch 主動跑
 * - Permission denied -> 結束（不註冊）
 * - Token 或 device id 取得失敗 -> 結束
 * - 前端用 cache 避免重複註冊
 */
export async function onUserAuthenticated(
  options: OnUserAuthenticatedOptions = {}
) {
  const { requestPermissionIfNeeded = true } = options;

  // 1) permission
  const status = await getPushPermissionStatus();
  if (status !== "granted") {
    if (!requestPermissionIfNeeded) return { ok: false, step: "permission" as const };
    const granted = await requestPushPermission();
    if (!granted) return { ok: false, step: "permission" as const };
  }

  // 2) token
  const fcmToken = await getFcmTokenOrNull();
  if (!fcmToken) return { ok: false, step: "token" as const };

  // 3) device id
  const deviceId = await getStableDeviceId();
  if (!deviceId) return { ok: false, step: "device_id" as const };

  // 4) register (idempotent)
  const result = await registerDeviceIfNeeded({ deviceId, fcmToken });

  // 5) cache extra
  const cache = await getRegistrationCache();
  if (cache.device_id !== deviceId) {
    await setRegistrationCache({ device_id: deviceId });
  }

  // 6) token refresh listener（最佳努力）
  startPushTokenRefreshListener(getStableDeviceId);

  return { ok: true, result };
}

export * from "./cache";
export * from "./getDeviceId";
export * from "./getFcmToken";
export * from "./permission";
export * from "./registerDevice";
export * from "./tokenRefresh";
export { deactivateCurrentDeviceOnLogout };


