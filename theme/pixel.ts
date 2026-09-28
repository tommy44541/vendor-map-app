import {
  fieldColors,
  fieldRadius,
  fieldSpacing,
  fieldTextSize,
  fieldTypography,
} from "./field";

// Compatibility layer: existing screens can migrate away from the old pixel
// naming gradually while already receiving the new field-guide visual system.

export const pixelColors = {
  bg: fieldColors.canvas,
  surface: fieldColors.surface,
  surfaceAlt: fieldColors.surfaceMuted,
  ink: fieldColors.text,
  white: fieldColors.white,
  paper: fieldColors.surfaceMuted,
  red: fieldColors.accent,
  gold: fieldColors.signal,
  blue: fieldColors.info,
  green: fieldColors.success,
  pink: fieldColors.plum,
  purple: fieldColors.primary,
  gray100: fieldColors.surfaceMuted,
  gray300: fieldColors.borderStrong,
  gray500: fieldColors.textMuted,
  gray700: fieldColors.primary,
  border: fieldColors.borderStrong,
  borderSoft: fieldColors.border,
} as const;

export type PixelColor = keyof typeof pixelColors;

export const pixelFont = {
  body: fieldTypography.body,
  display: fieldTypography.display,
  fallback: fieldTypography.body,
} as const;

export const pixelGrid = 4;

export const pixelSpacing = fieldSpacing;

// Legacy names keep the migration incremental for existing screens.
export const pixelBorderWidth = 1;
export const pixelBorderWidthThick = 1;

export const pixelRadius = fieldRadius.md;
export const pixelRadiusInner = fieldRadius.sm;

export const pixelTextSize = fieldTextSize;
