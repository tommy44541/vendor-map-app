import React, { useEffect, useState } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import {
  pixelColors,
  pixelBorderWidth,
  pixelRadiusInner,
  pixelSpacing,
} from "@/theme/pixel";
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
  label?: string;       // 空字串可隱藏 label
  cells?: number;
  tone?: Tone;
  stepMs?: number;      // 每格切換間隔
  size?: "sm" | "md" | "lg";
  style?: ViewStyle | ViewStyle[];
}

const sizeMap = {
  sm: { cell: 6, gap: 2 },
  md: { cell: 10, gap: 3 },
  lg: { cell: 14, gap: 4 },
};

export function PixelLoading({
  label = "LOADING",
  cells = 8,
  tone = "gold",
  stepMs = 140,
  size = "md",
  style,
}: PixelLoadingProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);

  const fillColor = toneToColor[tone];
  const dim = sizeMap[size];

  // bar:0 → cells → 0 → cells … 循環。
  const cyclePos = tick % (cells * 2);
  const filled =
    cyclePos < cells ? cyclePos + 1 : cells * 2 - cyclePos;

  // dots:每 4 格切一次,跟 bar 不同節拍,看起來不會死板。
  const dotCount = Math.floor(tick / 3) % 4;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <PixelText variant="bodyLg" display tone="default">
          {label}
          {".".repeat(dotCount)}
        </PixelText>
      ) : null}
      <View style={styles.barFrame}>
        {Array.from({ length: cells }).map((_, i) => (
          <View
            key={i}
            style={{
              width: dim.cell,
              height: dim.cell,
              marginRight: i === cells - 1 ? 0 : dim.gap,
              backgroundColor:
                i < filled ? fillColor : pixelColors.surfaceAlt,
              borderRadius: pixelRadiusInner,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: pixelSpacing.sm,
  },
  barFrame: {
    flexDirection: "row",
    padding: pixelSpacing.xs,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    backgroundColor: pixelColors.ink,
    borderRadius: pixelRadiusInner,
  },
});
