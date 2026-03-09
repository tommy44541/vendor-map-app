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
      activeOpacity={0.9}
      onPress={() => router.push("/consumer/notifications")}
      style={styles.hitArea}
    >
      <View style={[styles.fab, isFocused && styles.fabFocused]}>
        <Ionicons name="notifications" size={32} color="white" />
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
    width: 68,
    height: 68,
    borderRadius: 34,
    marginTop: -28,
    backgroundColor: "#FF6B6B",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabFocused: {
    shadowOpacity: 0.5,
    elevation: 10,
  },
});

export default ConsumerNotificationsTabButton;
