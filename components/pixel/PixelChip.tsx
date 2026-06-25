import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { pixelColors, pixelBorderWidth, pixelRadius } from "@/theme/pixel";
import { PixelText } from "./PixelText";

// PixelChip:像素風的標籤/狀態徽章/可點 chip。
// 預設無 borderRadius。

export interface PixelChipProps {
  label: string;
  tone?:
    | "red"
    | "gold"
    | "blue"
    | "green"
    | "pink"
    | "ink"
    | "paper"
    | "purple";
  active?: boolean;
  display?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const toneToColors = {
  red: { bg: pixelColors.red, fg: pixelColors.white },
  gold: { bg: pixelColors.gold, fg: pixelColors.ink },
  blue: { bg: pixelColors.blue, fg: pixelColors.white },
  green: { bg: pixelColors.green, fg: pixelColors.ink },
  pink: { bg: pixelColors.pink, fg: pixelColors.ink },
  ink: { bg: pixelColors.ink, fg: pixelColors.white },
  paper: { bg: pixelColors.paper, fg: pixelColors.ink },
  purple: { bg: pixelColors.purple, fg: pixelColors.white },
} as const;

export function PixelChip({
  label,
  tone = "paper",
  active = false,
  display = false,
  onPress,
  style,
}: PixelChipProps) {
  // 防呆:fallback 到 paper,避免 typo 把整個畫面拖崩
  const colors = toneToColors[tone] ?? toneToColors.paper;
  const inactiveStyle: ViewStyle = active
    ? {}
    : {
        backgroundColor: pixelColors.surfaceAlt,
      };
  const inactiveFg = active ? colors.fg : pixelColors.gray100;

  const inner = (
    <View
      style={[
        styles.body,
        { backgroundColor: colors.bg },
        inactiveStyle,
      ]}
    >
      <PixelText
        variant="caption"
        display={display}
        style={{ color: inactiveFg, letterSpacing: display ? 1 : 0 }}
      >
        {display ? label.toUpperCase() : label}
      </PixelText>
    </View>
  );

  if (!onPress) {
    return <View style={[styles.wrap, style]}>{inner}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.wrap, style]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  body: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
