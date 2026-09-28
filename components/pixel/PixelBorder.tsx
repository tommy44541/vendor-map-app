import React from "react";
import { View, ViewProps, ViewStyle } from "react-native";
import { pixelColors, pixelBorderWidth, pixelRadius } from "@/theme/pixel";

export interface PixelBorderProps extends ViewProps {
  variant?: "single" | "double" | "inset";
  borderColor?: string;
  innerColor?: string;
  background?: string;
  padding?: number;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function PixelBorder({
  variant = "double",
  borderColor = pixelColors.borderSoft,
  innerColor: _innerColor,
  background = pixelColors.surface,
  padding = 12,
  style,
  children,
  ...rest
}: PixelBorderProps) {
  return (
    <View
      {...rest}
      style={[
        {
          borderWidth: pixelBorderWidth,
          borderColor,
          backgroundColor:
            variant === "inset" ? pixelColors.surfaceAlt : background,
          padding,
          borderRadius: pixelRadius,
        },
        variant === "double"
          ? {
              shadowColor: pixelColors.ink,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 2,
            }
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
