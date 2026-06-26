// Discovery taxonomy 中文 label。
// 後端 discovery_categories / discovery_subcategories.name 目前都是英文(canonical),
// 前端顯示時翻譯,不要求後端加 i18n 欄位。
//
// 規則:
//   1) 優先用 slug 對應的本地中文(SUB → MAIN)
//   2) 找不到 → 退到後端傳的 name(英文)
//   3) 還是沒有 → 退到 slug 本身
//   4) 整包都 null → "未設定"

const SUB_LABELS: Record<string, string> = {
  // food
  rice_noodles: "飯麵主食",
  grill: "燒烤",
  fried: "炸物",
  light_meal: "輕食便當",
  // snack
  taiwanese: "台式小吃",
  bakery: "烘焙",
  sweet: "點心冰品",
  // beverage
  coffee: "咖啡",
  tea: "茶飲",
  juice: "果汁",
  alcohol: "酒類",
  // goods
  handmade: "手作飾品",
  lifestyle: "生活雜貨",
  plants_pets: "植栽寵物",
  // service
  portrait: "似顏繪/拍照",
  workshop: "手作體驗",
  performance: "街頭表演",
  repair: "維修服務",
  // other
  other: "其他",

  // legacy:舊 taxonomy 的 sub-slug,可能還有殘留資料
  meal: "餐食",
  dessert: "甜點",
  goods: "商品",
  fried_food: "炸物",
  accessory: "配件",
};

const MAIN_LABELS: Record<string, string> = {
  food: "餐食",
  snack: "小吃點心",
  beverage: "飲品",
  goods: "手作選物",
  service: "現場服務",
  other: "其他",

  // legacy
  experience: "生活體驗",
};

const HUB_TYPE_LABELS: Record<string, string> = {
  market: "市集",
  event: "活動",
  tourism_area: "觀光區",
  transit_area: "交通節點",
  other: "其他",
};

type Labelable = { slug?: string | null; name?: string | null } | null | undefined;

function resolve(item: string | Labelable, map: Record<string, string>): string | null {
  if (item == null) return null;
  if (typeof item === "string") return map[item] ?? null;
  const slug = item.slug ?? "";
  return map[slug] ?? item.name ?? slug ?? null;
}

const DEFAULT_FALLBACK = "未設定";

export function discoveryMainLabel(
  item: string | Labelable,
  fallback: string = DEFAULT_FALLBACK
): string {
  return resolve(item, MAIN_LABELS) ?? fallback;
}

export function discoverySubLabel(
  item: string | Labelable,
  fallback: string = DEFAULT_FALLBACK
): string {
  return resolve(item, SUB_LABELS) ?? fallback;
}

// 通用版:不確定 item 是 main 或 sub 時用(先 sub 後 main)。
export function discoveryLabel(
  item: string | Labelable,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (item == null) return fallback;
  const slug = typeof item === "string" ? item : item.slug ?? "";
  return (
    SUB_LABELS[slug] ??
    MAIN_LABELS[slug] ??
    (typeof item === "string" ? slug : item.name ?? slug) ??
    fallback
  );
}

export function discoveryHubTypeLabel(type?: string | null): string {
  if (!type) return "其他";
  return HUB_TYPE_LABELS[type] ?? type;
}
