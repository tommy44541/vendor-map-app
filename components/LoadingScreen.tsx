import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = "載入中...",
}: LoadingScreenProps) {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#4ECDC4" />
      <Text className="mt-4 text-base text-gray-500">{message}</Text>
    </View>
  );
}
