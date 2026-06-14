import { PixelText } from "@/components/pixel";
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { zxcvbn } from "@zxcvbn-ts/core";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  DEFAULT_PASSWORD_REQUIREMENTS,
  checkPasswordRequirements,
} from "../utils/passwordValidation";

interface PasswordStrengthProps {
  password: string;
  showHIBPCheck?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

interface StrengthLevel {
  label: string;
  color: string;
  score: number;
}

// 強度配色使用 pixel palette
const strengthLevels: StrengthLevel[] = [
  { label: "非常弱", color: pixelColors.red, score: 0 },
  { label: "弱", color: pixelColors.red, score: 1 },
  { label: "一般", color: pixelColors.gold, score: 2 },
  { label: "強", color: pixelColors.green, score: 3 },
  { label: "非常強", color: pixelColors.green, score: 4 },
];

export default function PasswordStrength({
  password,
  showHIBPCheck = false,
  onValidationChange,
}: PasswordStrengthProps) {
  const result = useMemo(() => {
    if (!password) return null;
    return zxcvbn(password);
  }, [password]);

  const currentStrength = useMemo(() => {
    if (!result) return strengthLevels[0];
    return strengthLevels[result.score] || strengthLevels[0];
  }, [result]);

  const requirementsCheck = useMemo(() => {
    if (!password) return null;
    return checkPasswordRequirements(password, DEFAULT_PASSWORD_REQUIREMENTS);
  }, [password]);

  const isPasswordStrongEnough = useMemo(() => {
    if (!result) return false;
    return result.score >= 2;
  }, [result]);

  const isFullyValid = useMemo(() => {
    if (!requirementsCheck) return false;
    return requirementsCheck.isValid && isPasswordStrongEnough;
  }, [requirementsCheck, isPasswordStrongEnough]);

  useEffect(() => {
    onValidationChange?.(isFullyValid);
  }, [isFullyValid, onValidationChange]);

  if (!password) return null;

  const score = result?.score || 0;

  return (
    <View>
      <View style={styles.row}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <PixelText variant="caption" tone="muted">
            密碼強度
          </PixelText>
          <PixelText variant="body" style={{ color: currentStrength.color }}>
            {currentStrength.label}
          </PixelText>
        </View>
        <PixelText variant="caption" tone="muted" display>
          {`${score} / 4`}
        </PixelText>
      </View>

      <View style={{ height: 6 }} />
      <View style={styles.barTrack}>
        {Array.from({ length: strengthLevels.length }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.barCell,
              {
                backgroundColor:
                  index <= score ? currentStrength.color : pixelColors.gray700,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  barTrack: {
    flexDirection: "row",
    gap: 3,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.ink,
    padding: 2,
  },
  barCell: {
    flex: 1,
    height: 8,
    borderRadius: 1,
  },
});
