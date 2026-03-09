import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PublishLocationNotificationData } from "@/services/api/notification";

const RECENT_PUBLISH_KEY = "vendor_recent_publish_result_v1";
const MAX_RECENT_PUBLISHES = 5;

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

async function getStoredItems(): Promise<StoredRecentPublishItem[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_PUBLISH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return normalizeStoredItems(parsed);
  } catch (error) {
    console.warn("讀取最近發布結果失敗:", error);
    return [];
  }
}

export async function saveRecentPublishedResult(data: PublishLocationNotificationData): Promise<void> {
  try {
    const current = await getStoredItems();
    const nextItem: StoredRecentPublishItem = {
      data,
      cachedAt: new Date().toISOString(),
    };
    const merged = [nextItem, ...current.filter((item) => item.data.ID !== data.ID)].slice(
      0,
      MAX_RECENT_PUBLISHES
    );
    const payload: StoredRecentPublishPayload = { items: merged };
    await AsyncStorage.setItem(RECENT_PUBLISH_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("保存最近發布結果失敗:", error);
  }
}

export async function getRecentPublishedResults(): Promise<PublishLocationNotificationData[]> {
  const items = await getStoredItems();
  return items.map((item) => item.data);
}

export async function getRecentPublishedResult(): Promise<PublishLocationNotificationData | null> {
  const list = await getRecentPublishedResults();
  return list[0] ?? null;
}

export async function clearRecentPublishedResult(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_PUBLISH_KEY);
  } catch (error) {
    console.warn("清除最近發布結果失敗:", error);
  }
}
