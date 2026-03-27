import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  note: string;
};

type Props = {
  title: string;
  subtitle: string;
  steps: Step[];
  colors: [string, string, string];
  accent: string;
  finishLabel: string;
  onFinish: () => Promise<void> | void;
  onSkip: () => Promise<void> | void;
};

export default function RoleOnboardingScreen({
  title,
  subtitle,
  steps,
  colors,
  accent,
  finishLabel,
  onFinish,
  onSkip,
}: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const currentStep = steps[index];
  const isLastStep = index === steps.length - 1;
  const titleFont = Platform.select({
    ios: "AvenirNext-Heavy",
    android: "sans-serif-condensed",
    default: undefined,
  });

  const stepCounter = useMemo(
    () => `${index + 1} / ${steps.length}`,
    [index, steps.length]
  );

  return (
    <LinearGradient colors={colors} style={{ flex: 1 }}>
      <View className="absolute -top-20 right-[-52] h-56 w-56 rounded-full bg-white/10" />
      <View className="absolute top-40 left-[-64] h-64 w-64 rounded-full bg-white/10" />
      <View className="absolute bottom-20 right-[-40] h-44 w-44 rounded-full bg-black/10" />

      <SafeAreaView className="flex-1 px-6">
        <View className="flex-row items-center justify-between pt-2">
          <View className="rounded-full bg-white/15 px-4 py-2">
            <Text className="text-xs font-semibold tracking-[0.5px] text-white">
              首次使用引導
            </Text>
          </View>
          <Pressable
            onPress={onSkip}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2"
          >
            <Text className="text-sm font-semibold text-white">略過</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
        >
          <View className="pt-8">
            <Text
              className="text-[34px] leading-[38px] text-white"
              style={{ fontFamily: titleFont }}
            >
              {title}
            </Text>
            <Text className="mt-3 text-sm leading-6 text-white/85">{subtitle}</Text>
          </View>

          <View className="mt-8 rounded-[32px] border border-white/15 bg-white/12 p-5">
            <View className="flex-row items-center justify-between">
              <View className="rounded-full bg-black/20 px-3 py-1.5">
                <Text className="text-[11px] font-semibold text-white/85">
                  {currentStep.eyebrow}
                </Text>
              </View>
              <Text className="text-xs font-semibold text-white/75">
                {stepCounter}
              </Text>
            </View>

            <View
              className="mt-5 h-28 w-28 items-center justify-center rounded-[28px] border border-white/20"
              style={{ backgroundColor: accent }}
            >
              <Ionicons name={currentStep.icon} size={42} color="#FFFFFF" />
            </View>

            <Text className="mt-6 text-[28px] leading-[32px] font-bold text-white">
              {currentStep.title}
            </Text>
            <Text className="mt-3 text-base leading-7 text-white/90">
              {currentStep.description}
            </Text>

            <View className="mt-5 rounded-2xl bg-black/20 px-4 py-3">
              <Text className="text-sm leading-6 text-white/85">
                {currentStep.note}
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row gap-2">
            {steps.map((_, stepIndex) => (
              <View
                key={`step-${stepIndex}`}
                className={`h-2 flex-1 rounded-full ${
                  stepIndex <= index ? "bg-white" : "bg-white/25"
                }`}
              />
            ))}
          </View>

          <View className="mt-auto pt-8">
            {isLastStep ? (
              <Pressable
                onPress={onFinish}
                className="items-center rounded-3xl bg-white py-4"
              >
                <Text className="text-base font-bold text-slate-900">
                  {finishLabel}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setIndex((prev) => prev + 1)}
                className="items-center rounded-3xl bg-white py-4"
              >
                <Text className="text-base font-bold text-slate-900">下一步</Text>
              </Pressable>
            )}

            <Text className="mt-4 text-center text-xs leading-5 text-white/70">
              引導只會在首次登入時顯示一次，之後可直接進入主畫面。
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
