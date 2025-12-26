import { Platform } from "react-native";
async function getNotificationsModule(): Promise<any | null> {
  try {
    return await import("expo-notifications");
  } catch (e) {
    console.warn("expo-notifications 尚未可用（可能需要重編譯 dev client）:", e);
    return null;
  }
}

/**
 * 取得推播 token。
 * 在 Expo Dev Client / Bare + FCM 設定正確時，Android 通常會回傳 FCM token；
 * iOS 會回傳 APNS device token（後端若統一以 FCMToken 欄位承接，需後端轉接/對應策略）。
 *
 * 依規格：token 取得失敗或空字串 -> 結束流程
 */
export async function getFcmTokenOrNull(): Promise<string | null> {
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return null;

    // Android 建議設定 channel（不影響 token 取得，但避免部分通知行為異常）
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const tokenRes = await Notifications.getDevicePushTokenAsync();
    const token = tokenRes?.data;
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return null;
    }
    return token.trim();
  } catch (e) {
    console.warn("取得推播 token 失敗:", e);
    return null;
  }
}


