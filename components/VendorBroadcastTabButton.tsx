import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import Octicons from "@expo/vector-icons/Octicons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

const VendorBroadcastTabButton = ({
  accessibilityState,
}: BottomTabBarButtonProps) => {
  const isFocused = !!accessibilityState?.selected;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={() => router.push("/vendor/notifications")}
      style={styles.hitArea}
    >
      <View style={styles.shadow}>
        <View
          style={[
            styles.fab,
            {
              backgroundColor: isFocused ? pixelColors.gold : pixelColors.red,
            },
          ]}
        >
          <Octicons
            name="broadcast"
            size={26}
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

export default VendorBroadcastTabButton;
