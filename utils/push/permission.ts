export type PushPermissionStatus = "granted" | "denied" | "undetermined";

async function getNotificationsModule(): Promise<any | null> {
  try {
    return await import("expo-notifications");
  } catch (e) {
    // 常見原因：dev client 尚未重編譯，native module 不存在
    console.warn("expo-notifications 尚未可用（可能需要重編譯 dev client）:", e);
    return null;
  }
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return "denied";

  const res = await Notifications.getPermissionsAsync();
  if (res.granted) return "granted";
  if (res.status === Notifications.PermissionStatus.DENIED) return "denied";
  return "undetermined";
}

/**
 * 依規格：不在 App Launch 主動請求；由 onUserAuthenticated() 觸發時才可呼叫。
 */
export async function requestPushPermission(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  return !!res.granted;
}


