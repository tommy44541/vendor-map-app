export type PushNotificationContentLike = {
  title?: unknown;
  body?: unknown;
  data?: unknown;
};

export type NormalizedPushNotificationContent = {
  title: string;
  body: string;
  data: Record<string, unknown>;
};

export type PushNotificationLocation = {
  latitude: number;
  longitude: number;
  merchantId?: string;
  locationName?: string;
  fullAddress?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const asText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const firstRecordText = (
  records: Record<string, unknown>[],
  keys: string[],
) => {
  for (const record of records) {
    for (const key of keys) {
      const text = asText(record[key]);
      if (text) return text;
    }
  }
  return undefined;
};

const getDataRecords = (data: Record<string, unknown>) => {
  const nestedRecords = [
    asRecord(data.notification),
    asRecord(data.payload),
    asRecord(data.data),
    asRecord(data.aps),
    asRecord(asRecord(data.aps)?.alert),
  ].filter((value): value is Record<string, unknown> => value !== null);

  return [data, ...nestedRecords];
};

const firstRecordNumber = (
  records: Record<string, unknown>[],
  keys: string[],
) => {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value !== "number" && typeof value !== "string") continue;

      const text = typeof value === "string" ? value.trim() : null;
      if (text === "") continue;

      const parsed = typeof value === "number" ? value : Number(text);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

export const getPushNotificationLocation = (
  content?: PushNotificationContentLike | null,
): PushNotificationLocation | null => {
  const data = asRecord(content?.data) ?? {};
  const records = getDataRecords(data);
  const latitude = firstRecordNumber(records, [
    "latitude",
    "lat",
    "merchant_latitude",
    "merchantLatitude",
  ]);
  const longitude = firstRecordNumber(records, [
    "longitude",
    "lng",
    "lon",
    "merchant_longitude",
    "merchantLongitude",
  ]);

  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    merchantId: firstRecordText(records, ["merchant_id", "merchantId"]),
    locationName: firstRecordText(records, [
      "location_name",
      "locationName",
    ]),
    fullAddress: firstRecordText(records, ["full_address", "fullAddress"]),
  };
};

export const normalizePushNotificationContent = (
  content?: PushNotificationContentLike | null,
): NormalizedPushNotificationContent => {
  const data = asRecord(content?.data) ?? {};
  const records = getDataRecords(data);

  const title =
    asText(content?.title) ??
    firstRecordText(records, [
      "title",
      "notification_title",
      "notificationTitle",
      "merchant_name",
      "merchantName",
    ]) ??
    "攤商通知";

  const locationText = firstRecordText(records, [
    "location_name",
    "locationName",
    "full_address",
    "fullAddress",
  ]);
  const body =
    asText(content?.body) ??
    firstRecordText(records, [
      "body",
      "message",
      "notification_body",
      "notificationBody",
      "hint_message",
      "hintMessage",
    ]) ??
    locationText ??
    "有新的攤商動態，請開啟 App 查看。";

  return { title, body, data };
};
