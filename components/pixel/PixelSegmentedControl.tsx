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
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              {
                backgroundColor: active ? pixelColors.purple : "transparent",
              },
            ]}
          >
            <PixelText
              variant="bodyLg"
              display={display}
              style={{
                color: active ? pixelColors.white : pixelColors.gray500,
                fontWeight: "600",
                letterSpacing: 0,
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
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: pixelRadius - 2,
  },
});
