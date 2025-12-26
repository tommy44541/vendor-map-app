import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DeviceRegistrationCache {
  device_registered: boolean;
  device_id: string | null;
  last_fcm_token: string | null;
  server_device_id: string | null;
  last_registered_at: string | null;
}

const CACHE_KEY = "push_device_registration_cache_v1";

const DEFAULT_CACHE: DeviceRegistrationCache = {
  device_registered: false,
  device_id: null,
  last_fcm_token: null,
  server_device_id: null,
  last_registered_at: null,
};

export async function getRegistrationCache(): Promise<DeviceRegistrationCache> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_CACHE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CACHE,
      ...parsed,
    } as DeviceRegistrationCache;
  } catch (e) {
    console.warn("讀取 push cache 失敗，將使用預設值:", e);
    return DEFAULT_CACHE;
  }
}

export async function setRegistrationCache(
  patch: Partial<DeviceRegistrationCache>
): Promise<DeviceRegistrationCache> {
  const current = await getRegistrationCache();
  const next: DeviceRegistrationCache = { ...current, ...patch };
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("寫入 push cache 失敗:", e);
  }
  return next;
}

export async function clearRegistrationCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn("清除 push cache 失敗:", e);
  }
}


