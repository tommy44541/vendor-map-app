import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function EntryScreen() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  const handleVendorEntry = () => {
    if (isAuthenticated && user && user.userType === "vendor") {
      // 已登入的攤商用戶，直接跳轉到攤商home頁面
      router.push("/vendor/home");
    } else if (isAuthenticated && user && user.userType === "consumer") {
      // 已登入的消費者用戶，提示選擇正確的身份
      alert("您當前登入的是消費者帳號，請先登出後選擇攤商端註冊");
    } else {
      // 未登入用戶，跳轉到攤商註冊頁面
      router.push("/auth/register?type=vendor");
    }
  };

  const handleConsumerEntry = () => {
    if (isAuthenticated && user && user.userType === "consumer") {
      // 已登入的消費者用戶，直接跳轉到消費者home頁面
      router.push("/consumer/home");
    } else if (isAuthenticated && user && user.userType === "vendor") {
      // 已登入的攤商用戶，提示選擇正確的身份
      alert("您當前登入的是攤商帳號，請先登出後選擇消費者端註冊");
    } else {
      // 未登入用戶，跳轉到消費者註冊頁面
      router.push("/auth/register?type=consumer");
    }
  };

  const handleLogin = () => {
    router.push("/auth/register?type=consumer");
  };

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
          onPress={handleVendorEntry}
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
                {isAuthenticated && user?.userType === "vendor"
                  ? "點擊進入攤商管理頁面"
                  : "管理您的攤車資訊、菜單和位置"}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* 消费者端入口 */}
        <TouchableOpacity
          className="h-1/3 rounded-2xl overflow-hidden shadow-lg"
          onPress={handleConsumerEntry}
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
                {isAuthenticated && user?.userType === "consumer"
                  ? "點擊進入消費者頁面"
                  : "探索美食攤車、查看菜單和評價"}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 登入連結和登出選項 */}
      <View className="items-center pb-6">
        {isAuthenticated ? (
          <View className="items-center">
            <Text className="text-gray-600 text-sm mb-2">
              已登入：{user?.name} (
              {user?.userType === "vendor" ? "攤商" : "消費者"})
            </Text>
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.7}
              className="mb-2"
            >
              <Text className="text-blue-600 text-base font-medium">
                切換帳號
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} activeOpacity={0.7}>
              <Text className="text-red-600 text-base font-medium">登出</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
            <Text className="text-blue-600 text-base font-medium">
              已經有帳號？點擊登入
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="items-center pb-10">
        <Text className="text-sm text-gray-400">
          {isAuthenticated ? "選擇您的身份或切換帳號" : "選擇您的身份開始使用"}
        </Text>
      </View>
    </View>
  );
}
