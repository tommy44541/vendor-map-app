import React from "react";
import { View, ViewProps, ViewStyle, StyleSheet } from "react-native";
import {
  pixelColors,
  pixelBorderWidth,
  pixelBorderWidthThick,
  pixelRadius,
  pixelRadiusInner,
} from "@/theme/pixel";

// PixelBorder 模擬 NES 對話框的雙層硬邊框:
// 外圈 4px 邊 + 內圈 2px 邊,中間插一條反向色形成「凸起」立體感。
// 完全沒有 borderRadius,維持像素感。

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
  borderColor = pixelColors.ink,
  innerColor = pixelColors.white,
  background = pixelColors.surface,
  padding = 12,
  style,
  children,
  ...rest
}: PixelBorderProps) {
  if (variant === "single") {
    return (
      <View
        {...rest}
        style={[
          {
            borderWidth: pixelBorderWidth,
            borderColor,
            backgroundColor: background,
            padding,
            borderRadius: pixelRadius,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (variant === "inset") {
    // 凹陷感:深色外框 + 較亮的內容區
    return (
      <View
        {...rest}
        style={[
          {
            borderTopWidth: pixelBorderWidthThick,
            borderLeftWidth: pixelBorderWidthThick,
            borderRightWidth: pixelBorderWidth,
            borderBottomWidth: pixelBorderWidth,
            borderTopColor: pixelColors.gray700,
            borderLeftColor: pixelColors.gray700,
            borderRightColor: pixelColors.gray300,
            borderBottomColor: pixelColors.gray300,
            backgroundColor: background,
            padding,
            borderRadius: pixelRadius,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // double:NES 對話框雙邊框
  return (
    <View
      style={[
        {
          borderWidth: pixelBorderWidthThick,
          borderColor,
          backgroundColor: borderColor,
          borderRadius: pixelRadius,
        },
        style,
      ]}
      {...rest}
    >
      <View
        style={{
          borderWidth: pixelBorderWidth,
          borderColor: innerColor,
          backgroundColor: background,
          padding,
          borderRadius: pixelRadiusInner,
        }}
      >
        {children}
      </View>
    </View>
  );
}

// 不留 unused styles 警告
StyleSheet.create({});
