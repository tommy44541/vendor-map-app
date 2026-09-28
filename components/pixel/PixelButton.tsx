import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { pixelColors, pixelBorderWidth, pixelRadius } from "@/theme/pixel";
import { PixelText } from "./PixelText";

type PixelButtonTone =
  | "red"
  | "gold"
  | "blue"
  | "green"
  | "pink"
  | "purple"
  | "ink"
  | "paper";

const toneToBg: Record<PixelButtonTone, string> = {
  red: pixelColors.red,
  gold: pixelColors.gold,
  blue: pixelColors.blue,
  green: pixelColors.green,
  pink: pixelColors.pink,
  purple: pixelColors.purple,
  ink: pixelColors.ink,
  paper: pixelColors.paper,
};

const toneToFg: Record<PixelButtonTone, string> = {
  red: pixelColors.white,
  gold: pixelColors.ink,
  blue: pixelColors.white,
  green: pixelColors.ink,
  pink: pixelColors.ink,
  purple: pixelColors.white,
  ink: pixelColors.white,
  paper: pixelColors.ink,
};

export interface PixelButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  tone?: PixelButtonTone;
  size?: "sm" | "md" | "lg";
  display?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function PixelButton({
  label,
  tone = "ink",
  size = "md",
  display = false,
  icon,
  fullWidth = false,
  onPressIn,
  onPressOut,
  disabled,
  style,
  ...rest
}: PixelButtonProps) {
  const bg = toneToBg[tone] ?? toneToBg.ink;
  const fg = toneToFg[tone] ?? toneToFg.ink;

  const paddingV = size === "sm" ? 6 : size === "lg" ? 14 : 10;
  const paddingH = size === "sm" ? 12 : size === "lg" ? 24 : 18;
  const variant = size === "sm" ? "body" : size === "lg" ? "title" : "bodyLg";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      {...rest}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        fullWidth ? styles.fullWidth : null,
        {
          opacity: disabled ? 0.45 : pressed ? 0.86 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.button,
          {
            backgroundColor: bg,
            paddingVertical: paddingV,
            paddingHorizontal: paddingH,
          },
        ]}
      >
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={size === "sm" ? 16 : 19}
              color={fg}
            />
          ) : null}
          <PixelText
            variant={variant}
            display={display}
            style={{ color: fg, fontWeight: "600", letterSpacing: 0 }}
          >
            {label}
          </PixelText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    borderWidth: pixelBorderWidth,
    borderColor: "rgba(37,44,39,0.12)",
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
