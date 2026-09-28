import Ionicons from "@expo/vector-icons/Ionicons";
import React, { forwardRef, useState } from "react";
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
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) {
    const hasError = !!error;
    const [focused, setFocused] = useState(false);
    return (
      <View style={[styles.wrap, containerStyle]}>
        {label ? (
          <View style={styles.labelRow}>
            <PixelText variant="body" tone="muted" style={styles.label}>
              {label}
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
            focused ? styles.fieldFocused : null,
            hasError ? styles.fieldError : null,
            style,
          ]}
        >
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            accessibilityHint={hint}
            {...rest}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor || pixelColors.gray500}
            selectionColor={pixelColors.green}
            cursorColor={pixelColors.green}
            style={styles.input}
          />
          {rightAdornment ? (
            <View style={styles.adornment}>{rightAdornment}</View>
          ) : null}
        </View>

        {error ? (
          <PixelText variant="caption" tone="red" style={styles.errorText}>
            {error}
          </PixelText>
        ) : null}
      </View>
    );
  }
);

// 密碼欄的顯示／隱藏按鈕。
export function PixelEyeToggle({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.eyeBtn}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={visible ? "隱藏密碼" : "顯示密碼"}
      accessibilityState={{ selected: visible }}
    >
      <Ionicons
        name={visible ? "eye-off-outline" : "eye-outline"}
        size={20}
        color={visible ? pixelColors.gold : pixelColors.gray500}
      />
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
  label: {
    fontWeight: "500",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: pixelColors.paper,
    borderTopWidth: pixelBorderWidth,
    borderLeftWidth: pixelBorderWidth,
    borderRightWidth: pixelBorderWidth,
    borderBottomWidth: pixelBorderWidth,
    borderTopColor: pixelColors.borderSoft,
    borderLeftColor: pixelColors.borderSoft,
    borderRightColor: pixelColors.borderSoft,
    borderBottomColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    paddingHorizontal: 10,
  },
  fieldError: {
    borderTopColor: pixelColors.red,
    borderLeftColor: pixelColors.red,
    borderRightColor: pixelColors.red,
    borderBottomColor: pixelColors.red,
  },
  fieldFocused: {
    borderTopColor: pixelColors.green,
    borderLeftColor: pixelColors.green,
    borderRightColor: pixelColors.green,
    borderBottomColor: pixelColors.green,
  },
  input: {
    flex: 1,
    color: pixelColors.ink,
    fontFamily: pixelFont.body,
    fontSize: pixelTextSize.bodyLg,
    lineHeight: Math.round(pixelTextSize.bodyLg * 1.3),
    paddingVertical: 12,
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
