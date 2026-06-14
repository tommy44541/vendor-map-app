import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import {
  pixelColors,
  pixelBorderWidth,
  pixelRadius,
} from "@/theme/pixel";
import { PixelText } from "./PixelText";

export interface PixelSegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface PixelSegmentedControlProps<T extends string> {
  options: PixelSegmentedControlOption<T>[];
  value: T;
  onChange: (next: T) => void;
  display?: boolean;
  style?: ViewStyle;
}

export function PixelSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  display = true,
  style,
}: PixelSegmentedControlProps<T>) {
  return (
    <View style={[styles.wrap, style]}>
      {options.map((opt, idx) => {
        const active = opt.value === value;
        const isFirst = idx === 0;
        const isLast = idx === options.length - 1;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              {
                backgroundColor: active
                  ? pixelColors.ink
                  : pixelColors.surfaceAlt,
                borderLeftWidth: isFirst ? 0 : pixelBorderWidth,
                borderLeftColor: pixelColors.ink,
                borderTopLeftRadius: isFirst ? pixelRadius - 1 : 0,
                borderBottomLeftRadius: isFirst ? pixelRadius - 1 : 0,
                borderTopRightRadius: isLast ? pixelRadius - 1 : 0,
                borderBottomRightRadius: isLast ? pixelRadius - 1 : 0,
              },
            ]}
          >
            <PixelText
              variant="bodyLg"
              display={display}
              style={{
                color: active ? pixelColors.gold : pixelColors.gray100,
                letterSpacing: 1,
              }}
            >
              {opt.label}
            </PixelText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
