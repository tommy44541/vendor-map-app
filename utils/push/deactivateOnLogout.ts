import { ApiError } from "../../services/api/util";
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
  let didDeactivate = false;

  try {
    if (serverId) {
      await deviceApi.deleteDevice(serverId);
      didDeactivate = true;
    }
  } catch (e) {
    const alreadyGone =
      e instanceof ApiError &&
      (e.code === "DEVICE_NOT_FOUND" || e.status === 404);
    if (!alreadyGone) {
      // 登出不應被卡住；讓流程繼續
      console.warn("登出停用裝置失敗:", e);
    }
  } finally {
    // 無論後端是否可用，都必須讓下一個登入帳號重新註冊。
    await setRegistrationCache({
      device_registered: false,
      user_id: null,
      server_device_id: null,
      last_registered_at: new Date().toISOString(),
    });
  }

  return { didDeactivate };
}
