import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelText,
} from "@/components/pixel";
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
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
  // 為了相容既有 callsite,接受 colors 但實際不使用
  colors?: [string, string, string];
  accent: string;
  finishLabel: string;
  onFinish: () => Promise<void> | void;
  onSkip: () => Promise<void> | void;
};

export default function RoleOnboardingScreen({
  title,
  subtitle,
  steps,
  accent,
  finishLabel,
  onFinish,
  onSkip,
}: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    StatusBar.setBarStyle("dark-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const currentStep = steps[index];
  const isLastStep = index === steps.length - 1;

  const stepCounter = useMemo(
    () => `${index + 1} / ${steps.length}`,
    [index, steps.length]
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <PixelChip label="首次使用引導" tone="gold" active />
          <PixelButton
            label="略過"
            tone="paper"
            size="sm"
            onPress={() => void onSkip()}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 32,
            flexGrow: 1,
          }}
        >
          <View style={{ gap: 6 }}>
            <PixelText variant="caption" tone="green">
              快速導覽
            </PixelText>
            <PixelText variant="display">{title}</PixelText>
            <View style={{ height: 4 }} />
            <PixelText variant="body" tone="muted">
              {subtitle}
            </PixelText>
          </View>

          <View style={{ height: 18 }} />

          <PixelCard
            title={`步驟 ${index + 1} / ${steps.length}`}
            titleTone="blue"
            padding={16}
          >
            <View style={styles.stepHeader}>
              <PixelChip label={currentStep.eyebrow} tone="purple" active />
              <PixelText variant="caption" tone="muted">
                {stepCounter}
              </PixelText>
            </View>

            <View style={{ height: 14 }} />
            <View style={styles.iconBox}>
              <Ionicons name={currentStep.icon} size={44} color={accent} />
            </View>

            <View style={{ height: 14 }} />
            <PixelText variant="titleLg">{currentStep.title}</PixelText>
            <View style={{ height: 8 }} />
            <PixelText variant="body" tone="muted">
              {currentStep.description}
            </PixelText>

            <View style={{ height: 12 }} />
            <View style={styles.noteBox}>
              <PixelText variant="caption" tone="green">
                小提醒
              </PixelText>
              <View style={{ height: 4 }} />
              <PixelText variant="body">{currentStep.note}</PixelText>
            </View>
          </PixelCard>

          <View style={{ height: 14 }} />
          <View style={styles.progressRow}>
            {steps.map((_, stepIndex) => (
              <View
                key={`step-${stepIndex}`}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      stepIndex <= index
                        ? pixelColors.purple
                        : pixelColors.borderSoft,
                  },
                ]}
              />
            ))}
          </View>

          <View style={{ flex: 1, minHeight: 24 }} />

          <View style={{ marginTop: 24 }}>
            <PixelButton
              label={isLastStep ? finishLabel : "下一步"}
              tone="purple"
              size="lg"
              fullWidth
              onPress={() => {
                if (isLastStep) {
                  void onFinish();
                  return;
                }
                setIndex((prev) => prev + 1);
              }}
            />
            <View style={{ height: 8 }} />
            <PixelText
              variant="caption"
              tone="muted"
              style={{ textAlign: "center" }}
            >
              引導只會在首次登入時顯示一次，之後可直接進入主畫面。
            </PixelText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBox: {
    width: 112,
    height: 112,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius * 2,
    backgroundColor: pixelColors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  noteBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 10,
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});
