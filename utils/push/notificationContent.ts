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

export const normalizePushNotificationContent = (
  content?: PushNotificationContentLike | null,
): NormalizedPushNotificationContent => {
  const data = asRecord(content?.data) ?? {};
  const nestedRecords = [
    asRecord(data.notification),
    asRecord(data.payload),
    asRecord(data.data),
    asRecord(data.aps),
    asRecord(asRecord(data.aps)?.alert),
  ].filter((value): value is Record<string, unknown> => value !== null);
  const records = [data, ...nestedRecords];

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
