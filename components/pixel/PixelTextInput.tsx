import React, { forwardRef } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import {
  pixelColors,
  pixelBorderWidth,
  pixelBorderWidthThick,
  pixelFont,
  pixelRadius,
  pixelTextSize,
} from "@/theme/pixel";
import { PixelText } from "./PixelText";

export interface PixelTextInputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  hint?: string;
  error?: string;
  rightAdornment?: React.ReactNode;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
}

export const PixelTextInput = forwardRef<TextInput, PixelTextInputProps>(
  function PixelTextInput(
    {
      label,
      hint,
      error,
      rightAdornment,
      style,
      containerStyle,
      placeholder,
      placeholderTextColor,
      ...rest
    },
    ref
  ) {
    const hasError = !!error;
    return (
      <View style={[styles.wrap, containerStyle]}>
        {label ? (
          <View style={styles.labelRow}>
            <PixelText variant="body" tone="muted" display style={{ letterSpacing: 1 }}>
              {label.toUpperCase()}
            </PixelText>
            {hint && !error ? (
              <PixelText variant="caption" tone="muted">
                {hint}
              </PixelText>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.field,
            hasError ? styles.fieldError : null,
            style,
          ]}
        >
          <TextInput
            ref={ref}
            {...rest}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor || pixelColors.gray500}
            allowFontScaling={false}
            selectionColor={pixelColors.gold}
            cursorColor={pixelColors.gold}
            style={styles.input}
          />
          {rightAdornment ? (
            <View style={styles.adornment}>{rightAdornment}</View>
          ) : null}
        </View>

        {error ? (
          <PixelText variant="caption" tone="red" style={styles.errorText}>
            ! {error}
          </PixelText>
        ) : null}
      </View>
    );
  }
);

// 給密碼欄做眼睛切換用的小元件,輸出像素風的 SHOW / HIDE 文字按鈕。
export function PixelEyeToggle({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.eyeBtn} hitSlop={8}>
      <PixelText
        variant="caption"
        display
        tone={visible ? "gold" : "muted"}
        style={{ letterSpacing: 1 }}
      >
        {visible ? "HIDE" : "SHOW"}
      </PixelText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // gap 由 parent 控制
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: pixelColors.paper,
    borderTopWidth: pixelBorderWidthThick,
    borderLeftWidth: pixelBorderWidthThick,
    borderRightWidth: pixelBorderWidth,
    borderBottomWidth: pixelBorderWidth,
    borderTopColor: pixelColors.ink,
    borderLeftColor: pixelColors.ink,
    borderRightColor: pixelColors.gray500,
    borderBottomColor: pixelColors.gray500,
    borderRadius: pixelRadius,
    paddingHorizontal: 10,
  },
  fieldError: {
    borderTopColor: pixelColors.red,
    borderLeftColor: pixelColors.red,
    borderRightColor: pixelColors.red,
    borderBottomColor: pixelColors.red,
  },
  input: {
    flex: 1,
    color: pixelColors.ink,
    fontFamily: pixelFont.body,
    fontSize: pixelTextSize.bodyLg,
    lineHeight: Math.round(pixelTextSize.bodyLg * 1.4),
    paddingVertical: 12,
    includeFontPadding: false,
  },
  adornment: {
    paddingLeft: 8,
  },
  errorText: {
    marginTop: 6,
    marginLeft: 2,
  },
  eyeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
