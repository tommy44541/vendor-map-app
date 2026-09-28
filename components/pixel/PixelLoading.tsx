import React from "react";
import { ActivityIndicator, StyleSheet, View, ViewStyle } from "react-native";
import { pixelColors, pixelSpacing } from "@/theme/pixel";
import { PixelText } from "./PixelText";

type Tone = "gold" | "red" | "blue" | "green" | "pink" | "purple" | "white";

const toneToColor: Record<Tone, string> = {
  gold: pixelColors.gold,
  red: pixelColors.red,
  blue: pixelColors.blue,
  green: pixelColors.green,
  pink: pixelColors.pink,
  purple: pixelColors.purple,
  white: pixelColors.white,
};

export interface PixelLoadingProps {
  label?: string;
  cells?: number;
  tone?: Tone;
  stepMs?: number;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle | ViewStyle[];
}

const sizeMap = { sm: "small", md: "small", lg: "large" } as const;

export function PixelLoading({
  label = "載入中",
  cells: _cells = 8,
  tone = "gold",
  stepMs: _stepMs = 140,
  size = "md",
  style,
}: PixelLoadingProps) {
  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator size={sizeMap[size]} color={toneToColor[tone]} />
      {label ? (
        <PixelText variant="body" tone="muted">
          {label}
        </PixelText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: pixelSpacing.sm,
  },
});
