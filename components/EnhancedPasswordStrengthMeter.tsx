import { zxcvbn } from "@zxcvbn-ts/core";
import React, { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import {
  DEFAULT_PASSWORD_REQUIREMENTS,
  checkPasswordRequirements,
} from "../utils/passwordValidation";

interface EnhancedPasswordStrengthMeterProps {
  password: string;
  showHIBPCheck?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

interface StrengthLevel {
  label: string;
  color: string;
  score: number;
}

const strengthLevels: StrengthLevel[] = [
  { label: "非常弱", color: "#EF4444", score: 0 },
  { label: "弱", color: "#F97316", score: 1 },
  { label: "一般", color: "#EAB308", score: 2 },
  { label: "強", color: "#22C55E", score: 3 },
  { label: "非常強", color: "#16A34A", score: 4 },
];

export default function EnhancedPasswordStrengthMeter({
  password,
  showHIBPCheck = false, // 默认关闭HIBP功能
  onValidationChange,
}: EnhancedPasswordStrengthMeterProps) {
  const result = useMemo(() => {
    if (!password) return null;
    return zxcvbn(password);
  }, [password]);

  const currentStrength = useMemo(() => {
    if (!result) return strengthLevels[0];
    return strengthLevels[result.score] || strengthLevels[0];
  }, [result]);

  // 使用新的统一验证函数进行详细检查
  const requirementsCheck = useMemo(() => {
    if (!password) return null;
    return checkPasswordRequirements(password, DEFAULT_PASSWORD_REQUIREMENTS);
  }, [password]);

  // 检查密码强度是否足够
  const isPasswordStrongEnough = useMemo(() => {
    if (!result) return false;
    return result.score >= 2; // 至少需要 "一般" 强度
  }, [result]);

  // 检查是否通过所有验证
  const isFullyValid = useMemo(() => {
    if (!requirementsCheck) return false;
    return requirementsCheck.isValid && isPasswordStrongEnough;
  }, [requirementsCheck, isPasswordStrongEnough]);

  // 通知父组件验证状态变化
  useEffect(() => {
    onValidationChange?.(isFullyValid);
  }, [isFullyValid, onValidationChange]);

  if (!password) return null;

  return (
    <View className="space-y-4">
      {/* 基础强度检查 */}
      <View className="space-y-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm font-medium text-gray-700">
            密碼強度:{" "}
            <Text style={{ color: currentStrength.color }}>
              {currentStrength.label}
            </Text>
          </Text>
          <Text className="text-xs text-gray-500">
            評分: {result?.score || 0}/4
          </Text>
        </View>
        {/* 強度條 */}
        <View className="flex-row items-center bg-gray-100 rounded-full">
          {Array.from({ length: strengthLevels.length }).map((_, index) => (
            <View
              key={index}
              className="flex-1 rounded-full"
              style={{
                height: 4,
                backgroundColor:
                  index <= (result?.score || 0)
                    ? strengthLevels[result?.score || 0].color
                    : "#E5E7EB",
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
