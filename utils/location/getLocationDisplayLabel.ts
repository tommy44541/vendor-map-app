const LOCATION_LABEL_TRANSLATIONS: Record<string, string> = {
  home: "家",
  work: "公司",
  office: "辦公室",
  company: "公司",
  current: "目前位置",
  "current location": "目前位置",
  default: "預設位置",
  primary: "主要地點",
};

export function getLocationDisplayLabel(label?: string | null) {
  const value = String(label || "").trim();
  if (!value) return "未命名地點";

  return LOCATION_LABEL_TRANSLATIONS[value.toLowerCase()] || value;
}
