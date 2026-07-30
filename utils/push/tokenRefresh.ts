import { getRegistrationCache } from "./cache";
import { registerDeviceIfNeeded } from "./registerDevice";

let subscription: { remove: () => void } | null = null;
let subscriptionUserId: string | null = null;
let listenerGeneration = 0;

async function getNotificationsModule(): Promise<any | null> {
  try {
    return await import("expo-notifications");
  } catch (e) {
    console.warn("expo-notifications 尚未可用（可能需要重編譯 dev client）:", e);
    return null;
  }
}

/**
 * 監聽推播 token 變更（若 Expo SDK 支援）。
 * 注意：需要在已登入且 permission granted 後啟動。
 */
export function startPushTokenRefreshListener(
  getDeviceId: () => Promise<string | null>,
  userId: string
) {
  if (subscriptionUserId === userId) return;

  stopPushTokenRefreshListener();
  subscriptionUserId = userId;
  const generation = listenerGeneration;

  // 這裡不做 await，避免把啟動流程卡住；改用背景方式嘗試
  (async () => {
    const Notifications = await getNotificationsModule();
    if (
      !Notifications ||
      generation !== listenerGeneration ||
      subscriptionUserId !== userId
    ) {
      return;
    }

    const anyNotifications = Notifications as any;
    if (typeof anyNotifications.addPushTokenListener !== "function") {
      // 部分版本可能沒有該 API，先安全降級
      return;
    }

    subscription = anyNotifications.addPushTokenListener(
      async (token: { type: string; data: string }) => {
        try {
          if (subscriptionUserId !== userId) return;

          const newToken = token?.data;
          if (!newToken || typeof newToken !== "string" || !newToken.trim()) {
            return;
          }

          const cache = await getRegistrationCache();
          if (cache.last_fcm_token === newToken.trim()) {
            return;
          }

          const deviceId = await getDeviceId();
          if (!deviceId) return;

          await registerDeviceIfNeeded({
            userId,
            deviceId,
            fcmToken: newToken.trim(),
          });
        } catch (e) {
          // 依規格：token refresh 失敗可背景重試；這裡先吞掉避免影響主流程
          console.warn("推播 token refresh 處理失敗:", e);
        }
      }
    );
  })();
}

export function stopPushTokenRefreshListener() {
  listenerGeneration += 1;
  try {
    subscription?.remove();
  } catch {
    // ignore
  } finally {
    subscription = null;
    subscriptionUserId = null;
  }
}

