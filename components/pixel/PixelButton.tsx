import React, { useState } from "react";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { pixelColors, pixelBorderWidth, pixelRadius } from "@/theme/pixel";
import { PixelText } from "./PixelText";

type PixelButtonTone = "red" | "gold" | "blue" | "green" | "purple" | "ink" | "paper";

const toneToBg: Record<PixelButtonTone, string> = {
  red: pixelColors.red,
  gold: pixelColors.gold,
  blue: pixelColors.blue,
  green: pixelColors.green,
  purple: pixelColors.purple,
  ink: pixelColors.ink,
  paper: pixelColors.paper,
};

const toneToFg: Record<PixelButtonTone, string> = {
  red: pixelColors.white,
  gold: pixelColors.ink,
  blue: pixelColors.white,
  green: pixelColors.ink,
  purple: pixelColors.white,
  ink: pixelColors.white,
  paper: pixelColors.ink,
};

export interface PixelButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  tone?: PixelButtonTone;
  size?: "sm" | "md" | "lg";
  display?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function PixelButton({
  label,
  tone = "ink",
  size = "md",
  display = false,
  fullWidth = false,
  onPressIn,
  onPressOut,
  disabled,
  style,
  ...rest
}: PixelButtonProps) {
  const [pressed, setPressed] = useState(false);
  const bg = toneToBg[tone];
  const fg = toneToFg[tone];

  // Press 時整個按鈕往下偏移 2px,模擬實體按下感
  const offset = pressed ? 2 : 0;

  const paddingV = size === "sm" ? 6 : size === "lg" ? 14 : 10;
  const paddingH = size === "sm" ? 12 : size === "lg" ? 24 : 18;
  const variant = size === "sm" ? "body" : size === "lg" ? "title" : "bodyLg";

  return (
    <View
      style={[
        styles.shadow,
        fullWidth ? styles.fullWidth : null,
        { opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={(e) => {
          setPressed(true);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          setPressed(false);
          onPressOut?.(e);
        }}
        style={{
          transform: [{ translateY: offset }, { translateX: offset }],
          backgroundColor: bg,
          borderWidth: pixelBorderWidth,
          borderColor: pixelColors.ink,
          borderRadius: pixelRadius,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PixelText
          variant={variant}
          display={display}
          style={{ color: fg, letterSpacing: display ? 1 : 0 }}
        >
          {label}
        </PixelText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // 用 ink 色的「背板」當作按鈕的硬陰影
  shadow: {
    backgroundColor: pixelColors.ink,
    borderRadius: pixelRadius,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
});
