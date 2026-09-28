import React from "react";
import { View, ViewProps, ViewStyle, StyleSheet } from "react-native";
import { pixelColors, pixelBorderWidth, pixelRadius } from "@/theme/pixel";
import { PixelText } from "./PixelText";

export interface PixelCardProps extends ViewProps {
  title?: string;
  titleTone?: "red" | "gold" | "blue" | "green" | "pink" | "ink" | "purple";
  titleDisplay?: boolean;
  background?: string;
  padding?: number;
  bodyFlex?: boolean;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

const titleTones = {
  red: { bg: "#F1E0DA", fg: pixelColors.red },
  gold: { bg: "#F2E9CE", fg: pixelColors.ink },
  blue: { bg: "#E1E9EB", fg: pixelColors.blue },
  green: { bg: "#DFE7DE", fg: pixelColors.green },
  pink: { bg: "#E9E1E8", fg: pixelColors.pink },
  ink: { bg: pixelColors.surfaceAlt, fg: pixelColors.ink },
  purple: { bg: "#DDE5DB", fg: pixelColors.purple },
} as const;

export function PixelCard({
  title,
  titleTone = "ink",
  titleDisplay = false,
  background = pixelColors.surface,
  padding = 16,
  bodyFlex = false,
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
            style={{ color: tone.fg, fontWeight: "600", letterSpacing: 0 }}
          >
            {title}
          </PixelText>
        </View>
      ) : null}
      <View
        style={[
          styles.body,
          { backgroundColor: background, padding },
          bodyFlex ? styles.bodyFlexible : null,
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
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    overflow: "hidden",
  },
  titleBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: pixelBorderWidth,
    borderBottomColor: pixelColors.borderSoft,
  },
  body: {},
  bodyFlexible: {
    flex: 1,
  },
});
