import { pixelColors, pixelBorderWidth, pixelRadius } from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

const ConsumerNotificationsTabButton = ({
  accessibilityState,
}: BottomTabBarButtonProps) => {
  const isFocused = !!accessibilityState?.selected;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={() => router.push("/consumer/notifications")}
      style={styles.hitArea}
    >
      {/* 用 ink 色背板模擬硬陰影,維持與 PixelButton 一致風格 */}
      <View style={styles.shadow}>
        <View
          style={[
            styles.fab,
            {
              backgroundColor: isFocused ? pixelColors.gold : pixelColors.red,
            },
          ]}
        >
          <Ionicons
            name="notifications"
            size={28}
            color={isFocused ? pixelColors.ink : pixelColors.white}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  hitArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shadow: {
    marginTop: -28,
    backgroundColor: pixelColors.ink,
    borderRadius: pixelRadius,
  },
  fab: {
    width: 60,
    height: 60,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -2 }, { translateY: -2 }],
  },
});

export default ConsumerNotificationsTabButton;
