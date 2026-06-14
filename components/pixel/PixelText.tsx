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
  default: pixelColors.white,
  muted: pixelColors.gray300,
  inverse: pixelColors.ink,
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
  display?: boolean; // 用英文像素字(Press Start 2P)
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
  // Press Start 2P 是 8px 字,實際顯示尺寸要乘以倍率,但 RN 接受任意 px,
  // 我們仍維持整數倍以維持像素感。
  const lineHeight = Math.round(fontSize * 1.4);
  const fontFamily = display ? pixelFont.display : pixelFont.body;

  return (
    <Text
      {...rest}
      allowFontScaling={false}
      style={[
        styles.base,
        {
          fontFamily,
          fontSize,
          lineHeight,
          color: toneToColor[tone],
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
