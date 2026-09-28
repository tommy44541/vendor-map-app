import { pixelColors, pixelBorderWidth } from "@/theme/pixel";
import Ionicons from "@expo/vector-icons/Ionicons";
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
      <View
        style={[
          styles.fab,
          {
            backgroundColor: isFocused ? pixelColors.purple : pixelColors.red,
          },
        ]}
      >
        <Ionicons name="notifications-outline" size={26} color={pixelColors.white} />
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
  fab: {
    marginTop: -28,
    width: 56,
    height: 56,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.surface,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: pixelColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default ConsumerNotificationsTabButton;
