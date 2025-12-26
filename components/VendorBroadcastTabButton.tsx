import Octicons from "@expo/vector-icons/Octicons";
import { Link } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";

const VendorBroadcastTabButton = () => {
  return (
    <Link href="/vendor/notifications" asChild>
      <TouchableOpacity className="bottom-4" accessibilityRole="button">
        <View className="w-20 h-20 rounded-full bg-[#FF6B6B] flex items-center justify-center p-0">
          <Octicons name="broadcast" size={40} color="white" />
        </View>
      </TouchableOpacity>
    </Link>
  );
};

export default VendorBroadcastTabButton;


