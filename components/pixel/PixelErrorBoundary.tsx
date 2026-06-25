import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { pixelColors, pixelSpacing } from "@/theme/pixel";
import { PixelText } from "./PixelText";
import { PixelCard } from "./PixelCard";
import { PixelButton } from "./PixelButton";

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

// React error boundary 必須是 class component。
// 沒抓住的話 render 期 throw 整個 RN tree 會崩成白屏。
export class PixelErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("PixelErrorBoundary caught:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <PixelCard title="GAME OVER" titleTone="red" titleDisplay padding={20}>
            <PixelText variant="bodyLg" tone="inverse">
              畫面意外當掉了。可以再試一次重新進入。
            </PixelText>

            <View style={styles.gap} />

            <PixelCard background={pixelColors.gray100} padding={12}>
              <PixelText variant="caption" tone="inverse">
                {error.message || String(error)}
              </PixelText>
            </PixelCard>

            <View style={styles.gap} />

            <PixelButton
              label="重新載入"
              tone="gold"
              fullWidth
              onPress={this.reset}
            />
          </PixelCard>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: pixelSpacing.lg,
  },
  gap: {
    height: pixelSpacing.md,
  },
});
