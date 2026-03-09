import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["left", "right", "bottom"]}>
      <LinearGradient
        colors={["#FF6B6B", "#FF8E53"]}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 18,
          paddingHorizontal: 16,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text className="text-2xl font-extrabold text-white">個人</Text>
        <Text className="text-sm text-white/85 mt-1">
          {user?.name ? `${user.name}（攤商）` : "攤商帳號"}
        </Text>
      </LinearGradient>

      <View className="flex-1 px-5 pt-4">
        <View className="bg-white border border-gray-200 rounded-3xl p-4">
          <View className="flex-row items-center gap-2">
            <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
              <Ionicons name="qr-code" size={18} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                我的訂閱 QR Code
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                顯示 / 匯出可列印 QR，讓顧客掃碼訂閱
              </Text>
            </View>
          </View>

          <Link
            href="/vendor/qrcode"
            asChild
          >
            <Pressable className="mt-4 bg-gray-900 rounded-2xl py-3 items-center">
              <Text className="text-white font-semibold">開啟 QR Code</Text>
            </Pressable>
          </Link>
        </View>

        <View className="mt-4 bg-white border border-gray-200 rounded-3xl p-4">
          <Text className="text-sm text-gray-700">
            其他個人功能後續補上（例：店家資料、營業時間、通知偏好）。
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Profile;
