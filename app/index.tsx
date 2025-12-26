import { LinearGradient } from "expo-linear-gradient";
import { useRootNavigationState, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import LoadingScreen from "../components/LoadingScreen";
import { useAuth } from "../contexts/AuthContext";

export default function IndexScreen() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const rootNavState = useRootNavigationState();

  useEffect(() => {
    // 避免在 navigation 尚未初始化時就呼叫 router.replace（會噴 navigation 未初始化）
    if (!rootNavState?.key) return;
    if (!isLoading && isAuthenticated && user) {
      if (user.userType === "vendor") {
        router.replace("/vendor/(tabs)/home");
      } else {
        router.replace("/consumer/home");
      }
    }
  }, [isAuthenticated, isLoading, user, router, rootNavState?.key]);

  const handleLogin = (type: "vendor" | "consumer") =>
    router.push(`/auth/register?type=${type}`);

  if (isLoading) {
    return <LoadingScreen message="正在檢查登入狀態..." />;
  }

  if (isAuthenticated && user) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Image
          source={require("../assets/images/logo.png")}
          className="w-20 h-20 mb-4"
          resizeMode="contain"
        />
        <Text className="text-xl font-bold text-gray-800 mb-2">
          歡迎回來，{user.name}！
        </Text>
        <Text className="text-base text-gray-500 mb-4">
          正在為您跳轉到{user.userType === "vendor" ? "攤商" : "消費者"}頁面...
        </Text>
        <LoadingScreen message="正在跳轉..." />
      </View>
    );
  }

  // 未认证用户显示身份选择页面
  return (
    <View className="flex-1 bg-gray-50">
      {/* 頂部Logo區域 */}
      <View className="items-center pt-20">
        <Image
          source={require("../assets/images/logo.png")}
          className="w-20 h-20"
          resizeMode="contain"
        />
        <Text className="text-3xl font-bold text-gray-800 mb-2">攤車雷達</Text>
        <Text className="text-base text-gray-500 text-center">
          發現身邊的美食攤車
        </Text>
      </View>

      {/* 兩個入口區塊 */}
      <View className="flex-1 px-6 justify-center gap-6">
        {/* 攤車商家端入口 */}
        <TouchableOpacity
          className="h-1/3 rounded-2xl overflow-hidden shadow-lg"
          onPress={() => handleLogin("vendor")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#FF6B6B", "#FF8E53"]}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={{ flex: 1, padding: 24 }}>
              {/* 圖標和標題行 */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: 16,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 32 }}>🍳</Text>
                </View>
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: 20,
                    width: 40,
                    height: 40,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 20, color: "white", fontWeight: "bold" }}
                  >
                    →
                  </Text>
                </View>
              </View>

              {/* 標題 */}
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: 8,
                }}
              >
                攤車商家端
              </Text>

              {/* 描述文字 */}
              <Text
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: 20,
                }}
              >
                管理您的攤車資訊、菜單和位置
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* 消费者端入口 */}
        <TouchableOpacity
          className="h-1/3 rounded-2xl overflow-hidden shadow-lg"
          onPress={() => handleLogin("consumer")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#4ECDC4", "#44A08D"]}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={{ flex: 1, padding: 24 }}>
              {/* 圖標和標題行 */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: 16,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 32 }}>👥</Text>
                </View>
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: 20,
                    width: 40,
                    height: 40,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 20, color: "white", fontWeight: "bold" }}
                  >
                    →
                  </Text>
                </View>
              </View>

              {/* 標題 */}
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: 8,
                }}
              >
                消費者端
              </Text>

              {/* 描述文字 */}
              <Text
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: 20,
                }}
              >
                探索美食攤車、查看菜單和評價
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View className="items-center pb-10">
        <Text className="text-sm text-gray-400">選擇您的身份開始使用</Text>
      </View>
    </View>
  );
}
