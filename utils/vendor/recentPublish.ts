import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PublishLocationNotificationData } from "@/services/api/notification";

const LEGACY_RECENT_PUBLISH_KEY = "vendor_recent_publish_result_v1";
const RECENT_PUBLISH_KEY_PREFIX = "vendor_recent_publish_result_v2";
const MAX_RECENT_PUBLISHES = 5;

const getRecentPublishKey = (merchantId: string) =>
  `${RECENT_PUBLISH_KEY_PREFIX}:${merchantId}`;

type StoredRecentPublishItem = {
  data: PublishLocationNotificationData;
  cachedAt: string;
};

type StoredRecentPublishPayload = {
  items: StoredRecentPublishItem[];
};

const isValidRecentPublish = (value: unknown): value is PublishLocationNotificationData => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.ID === "string" &&
    typeof v.MerchantID === "string" &&
    typeof v.LocationName === "string" &&
    typeof v.FullAddress === "string" &&
    typeof v.TotalSent === "number" &&
    typeof v.TotalFailed === "number" &&
    typeof v.PublishedAt === "string"
  );
};

const normalizeStoredItems = (parsed: unknown): StoredRecentPublishItem[] => {
  if (!parsed || typeof parsed !== "object") return [];

  const payload = parsed as Partial<StoredRecentPublishPayload>;
  if (Array.isArray(payload.items)) {
    return payload.items
      .filter((item): item is StoredRecentPublishItem => {
        if (!item || typeof item !== "object") return false;
        const i = item as Partial<StoredRecentPublishItem>;
        return isValidRecentPublish(i.data) && typeof i.cachedAt === "string";
      })
      .sort((a, b) => Date.parse(b.cachedAt) - Date.parse(a.cachedAt))
      .slice(0, MAX_RECENT_PUBLISHES);
  }

  // 向後相容：舊格式 { data, cachedAt }
  const legacy = parsed as Partial<StoredRecentPublishItem>;
  if (isValidRecentPublish(legacy.data)) {
    return [
      {
        data: legacy.data,
        cachedAt:
          typeof legacy.cachedAt === "string"
            ? legacy.cachedAt
            : new Date().toISOString(),
      },
    ];
  }

  return [];
};

async function getStoredItems(
  merchantId: string
): Promise<StoredRecentPublishItem[]> {
  try {
    const key = getRecentPublishKey(merchantId);
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      return normalizeStoredItems(parsed);
    }

    // 舊版是全域 key，只遷移 MerchantID 確實屬於目前帳號的資料。
    const legacyRaw = await AsyncStorage.getItem(LEGACY_RECENT_PUBLISH_KEY);
    if (!legacyRaw) return [];
    const legacyItems = normalizeStoredItems(
      JSON.parse(legacyRaw) as unknown
    ).filter((item) => item.data.MerchantID === merchantId);
    if (legacyItems.length > 0) {
      await AsyncStorage.setItem(
        key,
        JSON.stringify({ items: legacyItems } satisfies StoredRecentPublishPayload)
      );
    }
    await AsyncStorage.removeItem(LEGACY_RECENT_PUBLISH_KEY);
    return legacyItems;
  } catch (error) {
    console.warn("讀取最近發布結果失敗:", error);
    return [];
  }
}

export async function saveRecentPublishedResult(
  merchantId: string,
  data: PublishLocationNotificationData
): Promise<void> {
  try {
    const current = await getStoredItems(merchantId);
    const nextItem: StoredRecentPublishItem = {
      data,
      cachedAt: new Date().toISOString(),
    };
    const merged = [nextItem, ...current.filter((item) => item.data.ID !== data.ID)].slice(
      0,
      MAX_RECENT_PUBLISHES
    );
    const payload: StoredRecentPublishPayload = { items: merged };
    await AsyncStorage.setItem(
      getRecentPublishKey(merchantId),
      JSON.stringify(payload)
    );
  } catch (error) {
    console.warn("保存最近發布結果失敗:", error);
  }
}

export async function getRecentPublishedResults(
  merchantId: string
): Promise<PublishLocationNotificationData[]> {
  const items = await getStoredItems(merchantId);
  return items.map((item) => item.data);
}

export async function getRecentPublishedResult(
  merchantId: string
): Promise<PublishLocationNotificationData | null> {
  const list = await getRecentPublishedResults(merchantId);
  return list[0] ?? null;
}

export async function clearRecentPublishedResult(
  merchantId: string
): Promise<void> {
  try {
    await AsyncStorage.removeItem(getRecentPublishKey(merchantId));
  } catch (error) {
    console.warn("清除最近發布結果失敗:", error);
  }
}
