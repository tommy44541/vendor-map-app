import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Single source of truth for token storage keys + IO。
// 之前 util.ts 跟 AuthContext.tsx 各自直接 AsyncStorage.getItem("authToken"),
// 一旦字串 typo 就靜默壞掉,refactor 換 SecureStore 也要改兩處。

const ACCESS_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";

async function readSafe(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }

  const secureValue = await SecureStore.getItemAsync(key);
  if (secureValue) {
    return secureValue;
  }

  // 從舊版 AsyncStorage 一次性遷移到原生安全儲存。
  const legacyValue = await AsyncStorage.getItem(key);
  if (legacyValue) {
    await SecureStore.setItemAsync(key, legacyValue);
    await AsyncStorage.removeItem(key);
  }
  return legacyValue;
}

async function writeSafe(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
  await AsyncStorage.removeItem(key);
}

async function removeSafe(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(key),
    AsyncStorage.removeItem(key),
  ]);
}

export const tokenStorage = {
  getAccessToken: () => readSafe(ACCESS_TOKEN_KEY),
  setAccessToken: (token: string) => writeSafe(ACCESS_TOKEN_KEY, token),
  clearAccessToken: () => removeSafe(ACCESS_TOKEN_KEY),

  getRefreshToken: () => readSafe(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => writeSafe(REFRESH_TOKEN_KEY, token),
  clearRefreshToken: () => removeSafe(REFRESH_TOKEN_KEY),

  clearAll: async () => {
    await Promise.all([removeSafe(ACCESS_TOKEN_KEY), removeSafe(REFRESH_TOKEN_KEY)]);
  },
};
