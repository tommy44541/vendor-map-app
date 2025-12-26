import { Platform } from "react-native";
async function getApplicationModule(): Promise<any | null> {
  try {
    return await import("expo-application");
  } catch (e) {
    console.warn("expo-application 尚未可用（可能需要重編譯 dev client）:", e);
    return null;
  }
}

/**
 * 依規格：必須「穩定且可重複取得」，避免使用隨機 UUID。
 * - iOS：IDFV（同一 vendor 穩定）
 * - Android：androidId（裝置層級穩定，出廠重置/多使用者等情境可能變更，屬可接受範圍）
 */
export async function getStableDeviceId(): Promise<string | null> {
  try {
    const Application = await getApplicationModule();
    if (!Application) return null;

    if (Platform.OS === "ios") {
      const idfv = await Application.getIosIdForVendorAsync();
      return idfv || null;
    }
    if (Platform.OS === "android") {
      return Application.getAndroidId() || null;
    }
    return null;
  } catch (e) {
    console.warn("取得 stable device id 失敗:", e);
    return null;
  }
}


