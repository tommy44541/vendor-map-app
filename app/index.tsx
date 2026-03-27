import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRootNavigationState, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingScreen from "../components/LoadingScreen";
import { useAuth } from "../contexts/AuthContext";
import { getPostAuthRoute } from "../utils/onboarding";

function RoleCard({
  title,
  description,
  icon,
  colors,
  onPress,
  height,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string, ...string[]];
  onPress: () => void;
  height: number;
}) {
  const titleFont = Platform.select({
    ios: "AvenirNext-Bold",
    android: "sans-serif-condensed",
    default: undefined,
  });

  return (
    <Pressable
      onPress={onPress}
      className="rounded-3xl overflow-hidden shadow-xl"
      style={{ height }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, padding: 22 }}
      >
        <View className="flex-row items-start justify-between">
          <View className="w-12 h-12 rounded-2xl bg-white/25 items-center justify-center">
            <Ionicons name={icon} size={24} color="#fff" />
          </View>
          <View className="w-10 h-10 rounded-2xl bg-white/25 items-center justify-center">
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </View>
        </View>

        <View className="mt-4">
          <Text
            className="text-white text-[26px] leading-[30px]"
            style={{ fontFamily: titleFont }}
          >
            {title}
          </Text>
          <Text className="text-white/90 text-sm leading-6 mt-2">{description}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function IndexScreen() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const rootNavState = useRootNavigationState();
  const { height: windowHeight } = useWindowDimensions();
  const cardHeight = Math.max(172, Math.min(224, Math.round(windowHeight * 0.24)));
  const titleFont = Platform.select({
    ios: "AvenirNext-Heavy",
    android: "sans-serif-condensed",
    default: undefined,
  });

  useEffect(() => {
    // 避免在 navigation 尚未初始化時就呼叫 router.replace（會噴 navigation 未初始化）
    if (!rootNavState?.key) return;
    if (!isLoading && isAuthenticated && user) {
      const run = async () => {
        const nextRoute = await getPostAuthRoute(user);
        router.replace(nextRoute);
      };
      run();
    }
  }, [isAuthenticated, isLoading, user, router, rootNavState?.key]);

  const handleLogin = (type: "vendor" | "consumer") =>
    router.push(`/auth/register?type=${type}`);

  if (isLoading) {
    return <LoadingScreen message="正在檢查登入狀態..." />;
  }

  if (isAuthenticated && user) {
    return (
      <LinearGradient colors={["#0F172A", "#102A43", "#1E293B"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-[360px] rounded-3xl bg-white/10 border border-white/20 p-6 items-center">
            <Image
              source={require("../assets/images/logo.png")}
              className="w-20 h-20 mb-4"
              resizeMode="contain"
            />
            <Text className="text-white text-xl font-bold mb-2">歡迎回來，{user.name}！</Text>
            <Text className="text-white/80 text-sm mb-4">
              正在為您跳轉到{user.userType === "vendor" ? "攤商" : "消費者"}頁面...
            </Text>
            <LoadingScreen message="正在跳轉..." />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // 未认证用户显示身份选择页面
  return (
    <LinearGradient colors={["#FFF7ED", "#EEF6FF", "#ECFDF5"]} style={{ flex: 1 }}>
      <View className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-orange-200/40" />
      <View className="absolute top-44 -left-16 w-44 h-44 rounded-full bg-cyan-200/40" />
      <View className="absolute bottom-28 right-0 w-40 h-40 rounded-full bg-indigo-200/40" />

      <SafeAreaView className="flex-1">
        <View className="px-6 pt-4 items-center">
          <View className="mt-4 items-center">
            <View className="w-14 h-14 rounded-2xl bg-white/80 items-center justify-center border border-white mb-4">
              <Image
                source={require("../assets/images/logo.png")}
                className="w-10 h-10"
                resizeMode="contain"
              />
            </View>
            <Text
              className="text-[34px] leading-[42px] text-gray-900 text-center mt-1"
              style={{ fontFamily: titleFont }}
            >
              攤車雷達
            </Text>
            <Text className="text-gray-600 text-sm mt-1 text-center">
              你的街邊美食通知系統
            </Text>
          </View>
        </View>

        <View className="flex-1 px-6 justify-center gap-4">
          <RoleCard
            title="攤車商家端"
            description="發布位置與通知、管理店家資訊與營運節奏。"
            icon="storefront-outline"
            colors={["#F97316", "#EA580C", "#BE123C"]}
            onPress={() => handleLogin("vendor")}
            height={cardHeight}
          />
          <RoleCard
            title="消費者端"
            description="追蹤喜歡的攤車，第一時間接收附近營業通知。"
            icon="compass-outline"
            colors={["#0EA5E9", "#0284C7", "#0F766E"]}
            onPress={() => handleLogin("consumer")}
            height={cardHeight}
          />
        </View>

        <View className="items-center pb-6 px-6">
          <Text className="text-xs text-gray-500">選擇你的身份開始使用</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
