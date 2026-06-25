import AsyncStorage from "@react-native-async-storage/async-storage";

// Single source of truth for token storage keys + IO。
// 之前 util.ts 跟 AuthContext.tsx 各自直接 AsyncStorage.getItem("authToken"),
// 一旦字串 typo 就靜默壞掉,refactor 換 SecureStore 也要改兩處。

const ACCESS_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";

async function readSafe(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.error(`read ${key} failed:`, e);
    return null;
  }
}

async function writeSafe(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.error(`write ${key} failed:`, e);
  }
}

async function removeSafe(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error(`remove ${key} failed:`, e);
  }
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
