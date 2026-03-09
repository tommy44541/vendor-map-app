export type MerchantSubscribeQrPayloadV1 = {
  v: 1;
  type: "merchant_subscribe";
  merchant_id: string;
};

export function buildMerchantSubscribeQrData(merchantId: string) {
  const id = String(merchantId || "").trim();
  // 使用 app scheme，未來也可做 deep link（同時又能讓掃碼結果容易辨識）
  return `vendormapapp://subscribe?merchant_id=${encodeURIComponent(id)}&v=1`;
}

function tryParseUrlMerchantId(raw: string): string | null {
  try {
    // iOS/Android RN 皆支援 URL；若遇到非標準字串會丟例外
    const u = new URL(raw);
    const merchantId =
      u.searchParams.get("merchant_id") ||
      u.searchParams.get("merchantId") ||
      null;
    if (merchantId && merchantId.trim()) return merchantId.trim();
    return null;
  } catch {
    return null;
  }
}

function tryParseJsonMerchantId(raw: string): string | null {
  try {
    const obj = JSON.parse(raw) as any;
    const merchantId =
      obj?.merchant_id || obj?.merchantId || obj?.merchant || obj?.id || null;
    if (typeof merchantId === "string" && merchantId.trim()) return merchantId.trim();
    return null;
  } catch {
    return null;
  }
}

const looksLikeUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 從掃到的 QR 字串推導 merchant_id（不保證一定成功）。
 * - 若是 vendormapapp://subscribe?merchant_id=... -> 解析 query
 * - 若是 JSON -> 取 merchant_id/merchantId 等欄位
 * - 若是單純字串且像 UUID -> 視為 merchant_id
 */
export function parseMerchantIdFromQrData(qrData: string): string | null {
  const raw = String(qrData || "").trim();
  if (!raw) return null;

  const fromUrl = tryParseUrlMerchantId(raw);
  if (fromUrl) return fromUrl;

  // 有些掃碼器可能會把 URL 做成大寫 scheme 或加上空白，這裡做寬鬆處理
  if (raw.includes("://") || raw.startsWith("http")) {
    const retry = tryParseUrlMerchantId(raw.replace(/\s/g, ""));
    if (retry) return retry;
  }

  const fromJson = tryParseJsonMerchantId(raw);
  if (fromJson) return fromJson;

  if (looksLikeUuid.test(raw)) return raw;

  return null;
}

