import React from "react";
import { StyleSheet, Text, TextProps, TextStyle } from "react-native";
import { pixelColors, pixelFont, pixelTextSize } from "@/theme/pixel";

type PixelTextVariant =
  | "caption"
  | "body"
  | "bodyLg"
  | "title"
  | "titleLg"
  | "display"
  | "hero";

type PixelTextTone =
  | "default"
  | "muted"
  | "inverse"
  | "red"
  | "gold"
  | "blue"
  | "green"
  | "pink"
  | "purple";

const toneToColor: Record<PixelTextTone, string> = {
  default: pixelColors.ink,
  muted: pixelColors.gray500,
  inverse: pixelColors.white,
  red: pixelColors.red,
  gold: pixelColors.gold,
  blue: pixelColors.blue,
  green: pixelColors.green,
  pink: pixelColors.pink,
  purple: pixelColors.purple,
};

export interface PixelTextProps extends TextProps {
  variant?: PixelTextVariant;
  tone?: PixelTextTone;
  display?: boolean; // Compatibility prop: now selects the display system face.
  style?: TextStyle | TextStyle[];
}

export function PixelText({
  variant = "body",
  tone = "default",
  display = false,
  style,
  ...rest
}: PixelTextProps) {
  const fontSize = pixelTextSize[variant];
  const lineHeight = Math.round(fontSize * (variant === "caption" ? 1.4 : 1.3));
  const fontFamily = display ? pixelFont.display : pixelFont.body;
  const fontWeight =
    variant === "hero" || variant === "display"
      ? "700"
      : variant === "titleLg" || variant === "title"
        ? "600"
        : variant === "bodyLg"
          ? "500"
          : "400";

  return (
    <Text
      {...rest}
      style={[
        styles.base,
        {
          fontFamily,
          fontSize,
          lineHeight,
          color: toneToColor[tone],
          fontWeight,
          letterSpacing: 0,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
