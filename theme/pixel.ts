// NES 多彩風像素 UI design token。
// 嚴格限定一組調色盤,讓全 app 配色一致、好維護。

export const pixelColors = {
  // 底色
  bg: "#2A2D43",           // 深 navy 紫,比純黑亮一階,仍保有夜晚復古感
  surface: "#3A3D55",      // 卡片底
  surfaceAlt: "#4A4D65",   // 次卡片底
  ink: "#0B0B12",          // 文字/邊框黑

  // 對比
  white: "#F8F0E3",        // 偏暖的米白(不要純白,純白太「網頁感」)
  paper: "#EDE3CC",        // 紙感淺米

  // NES accent
  red: "#E63946",          // 鮮紅(主 CTA、警示)
  gold: "#F4B940",         // 金黃(高亮、星星、價格)
  blue: "#3A86FF",         // 寶藍(連結、資訊)
  green: "#5BBA6F",        // 草綠(成功、營業中)
  pink: "#FF77A8",         // 粉(裝飾、訂閱)
  purple: "#7C5CFF",       // 紫(次強調)

  // 灰階
  gray100: "#E5E0D5",
  gray300: "#A8A29E",
  gray500: "#6B6863",
  gray700: "#3A3A48",

  // 狀態
  border: "#0B0B12",       // 像素風永遠是黑色硬邊
  borderSoft: "#3A3A48",
} as const;

export type PixelColor = keyof typeof pixelColors;

export const pixelFont = {
  // 中文像素字(載入後使用),英文/數字也可以
  body: "Cubic11",
  // 純英文像素字(更銳利的標題、按鈕英文文字)
  display: "PressStart2P",
  // 字體還沒載入時的 fallback
  fallback: "monospace",
} as const;

// 像素網格基準:所有 spacing / radius 都是 2px 的倍數,維持像素感。
export const pixelGrid = 2;

export const pixelSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// 像素風一律不使用 borderRadius — 邊角是硬的。
// 例外:tab bar 或 modal 等需要視覺呼吸的容器,可手動 stepped 角(用 2px 黑邊堆疊)。

export const pixelBorderWidth = 2;
export const pixelBorderWidthThick = 4;

// 微圓角:保留像素硬邊感,但角落帶 4px 圓角讓視覺不那麼刺。
export const pixelRadius = 4;
export const pixelRadiusInner = 2;

// 文字尺寸 — 像素字體不能無級縮放,只能用整數倍。
// Cubic 11 是 11px 字體,11/22/33 是天然清晰倍率;Press Start 2P 是 8px 字體。
export const pixelTextSize = {
  caption: 11,
  body: 14,
  bodyLg: 16,
  title: 18,
  titleLg: 22,
  display: 28,
  hero: 40,
} as const;
