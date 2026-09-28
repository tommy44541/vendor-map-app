import { Platform } from "react-native";

/**
 * Semantic design tokens for the modern field-guide visual language.
 * Colors intentionally mix mineral neutrals, forest green, clay and blue-gray
 * so the interface feels grounded without becoming a one-note beige theme.
 */
export const fieldColors = {
  canvas: "#ECEFEA",
  surface: "#FAFAF7",
  surfaceMuted: "#F1F2EC",
  text: "#252C27",
  textMuted: "#687269",
  primary: "#435A49",
  primarySoft: "#DDE5DB",
  accent: "#B85F45",
  accentSoft: "#F1E0DA",
  signal: "#D3A647",
  signalSoft: "#F2E9CE",
  info: "#57747D",
  infoSoft: "#E1E9EB",
  success: "#59735E",
  successSoft: "#DFE7DE",
  plum: "#756174",
  plumSoft: "#E9E1E8",
  border: "#CCD2C9",
  borderStrong: "#AEB8AC",
  white: "#FFFFFF",
  scrim: "rgba(24,31,26,0.48)",
} as const;

export const fieldTypography = {
  body: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "system-ui",
  }),
  display: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "system-ui",
  }),
} as const;

export const fieldSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fieldRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 999,
} as const;

export const fieldTextSize = {
  caption: 12,
  body: 15,
  bodyLg: 16,
  title: 19,
  titleLg: 23,
  display: 29,
  hero: 36,
} as const;
