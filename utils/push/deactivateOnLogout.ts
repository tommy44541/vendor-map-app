import { deviceApi } from "../../services/api/device";
import { getRegistrationCache, setRegistrationCache } from "./cache";

/**
 * 依規格：登出時停用裝置，避免繼續收推播。
 * 目前後端提供 DELETE /api/v1/devices/:id（soft delete），先用此達成。
 *
 * 若未曾成功註冊（無 server_device_id）則 no-op。
 */
export async function deactivateCurrentDeviceOnLogout(): Promise<{
  didDeactivate: boolean;
}> {
  const cache = await getRegistrationCache();
  const serverId = cache.server_device_id;
  if (!serverId) return { didDeactivate: false };

  try {
    const res = await deviceApi.deleteDevice(serverId);
    if (!res.success) {
      return { didDeactivate: false };
    }
    await setRegistrationCache({
      device_registered: false,
      server_device_id: null,
      last_registered_at: new Date().toISOString(),
    });
    return { didDeactivate: true };
  } catch (e) {
    // 登出不應被卡住；讓流程繼續
    console.warn("登出停用裝置失敗:", e);
    return { didDeactivate: false };
  }
}


