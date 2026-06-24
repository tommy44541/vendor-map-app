import React from "react";
import { View, ViewProps, ViewStyle, StyleSheet } from "react-native";
import { pixelColors, pixelBorderWidth, pixelRadius } from "@/theme/pixel";
import { PixelText } from "./PixelText";

// PixelCard:RPG 對話框風格,可有 header tag(像 NES 主選單上方的牌子)。

export interface PixelCardProps extends ViewProps {
  title?: string;
  titleTone?: "red" | "gold" | "blue" | "green" | "pink" | "ink" | "purple";
  titleDisplay?: boolean;
  background?: string;
  padding?: number;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

const titleTones = {
  red: { bg: pixelColors.red, fg: pixelColors.white },
  gold: { bg: pixelColors.gold, fg: pixelColors.ink },
  blue: { bg: pixelColors.blue, fg: pixelColors.white },
  green: { bg: pixelColors.green, fg: pixelColors.ink },
  pink: { bg: pixelColors.pink, fg: pixelColors.ink },
  ink: { bg: pixelColors.ink, fg: pixelColors.white },
  purple: { bg: pixelColors.purple, fg: pixelColors.white },
} as const;

export function PixelCard({
  title,
  titleTone = "ink",
  titleDisplay = false,
  background = pixelColors.surface,
  padding = 16,
  style,
  children,
  ...rest
}: PixelCardProps) {
  // 防呆:fallback 到 ink
  const tone = titleTones[titleTone] ?? titleTones.ink;

  return (
    <View {...rest} style={[styles.wrap, style]}>
      {title ? (
        <View style={[styles.titleBar, { backgroundColor: tone.bg }]}>
          <PixelText
            variant="bodyLg"
            display={titleDisplay}
            style={{ color: tone.fg, letterSpacing: titleDisplay ? 1 : 0 }}
          >
            {title}
          </PixelText>
        </View>
      ) : null}
      <View
        style={[
          styles.body,
          { backgroundColor: background, padding },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    // 讓 title bar 的方角被裁出圓角來
    overflow: "hidden",
  },
  titleBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: pixelBorderWidth,
    borderBottomColor: pixelColors.ink,
  },
  body: {
    // padding by prop
  },
});
