import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import type { PublishLocationNotificationData } from "@/services/api/notification";
import {
  clearRecentPublishedResult,
  getRecentPublishedResults,
} from "@/utils/vendor/recentPublish";

export default function VendorHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [recentPublishes, setRecentPublishes] = useState<
    PublishLocationNotificationData[]
  >([]);

  // 设置状态栏样式
  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("登出失败:", error);
    }
  };

  const formatPublishTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const loadRecentPublish = useCallback(async () => {
    const cached = await getRecentPublishedResults();
    setRecentPublishes(cached);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentPublish();
    }, [loadRecentPublish])
  );

  const handleClearRecentPublish = () => {
    Alert.alert("清除送出紀錄", "要清除此區塊顯示的本地紀錄（最多5筆）嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "清除",
        style: "destructive",
        onPress: async () => {
          await clearRecentPublishedResult();
          setRecentPublishes([]);
        },
      },
    ]);
  };

  const menuItems = [
    {
      id: "profile",
      title: "個人資料",
      description: "管理您的攤車資訊",
      icon: "👤",
      color: "#FF6B6B",
      onPress: () => router.push("/vendor/profile"),
    },
    {
      id: "menu",
      title: "菜單管理",
      description: "管理您的菜單",
      icon: "🍔",
      color: "#45B7D1",
      onPress: () => router.push("/vendor/menu"),
    },
    {
      id: "location",
      title: "位置設定",
      description: "設定攤車營業位置",
      icon: "📍",
      color: "#45B7D1",
      onPress: () => router.push("/vendor/location"),
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* 顶部状态栏 */}
      <LinearGradient
        colors={["#FF6B6B", "#FF8E53"]}
        style={{
          paddingTop: 48,
          paddingBottom: 10,
          paddingHorizontal: 10,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            className="flex-row items-center flex-1"
            onPress={() => setShowUserMenu(true)}
            activeOpacity={0.8}
          >
            <View className="w-12 h-12 rounded-full bg-white/20 justify-center items-center mr-4">
              <Text className="text-2xl font-bold text-white">
                {user?.name?.charAt(0) || "攤"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-white/80 mb-1">歡迎回來</Text>
              <Text className="text-xl font-bold text-white">
                {user?.name || "攤車商家"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="bg-white/10 rounded-2xl p-5">
          <Text className="text-base font-semibold text-white mb-4 text-center">
            今日營業狀態
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-xl font-bold text-white mb-1">-</Text>
              <Text className="text-xs text-white/80">訂單</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold text-white mb-1">-</Text>
              <Text className="text-xs text-white/80">追蹤人數</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold text-white mb-1">-</Text>
              <Text className="text-xs text-white/80">評分</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* 主要内容区域 */}
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8">
          <Text className="text-xl font-bold text-gray-800 mb-5">快速功能</Text>
          <View className="w-full flex-row justify-between flex-wrap">
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                className="w-[30%] bg-white rounded-2xl p-5 items-center shadow-sm"
                onPress={item.onPress}
                activeOpacity={0.8}
              >
                <View
                  className="w-12 h-12 rounded-full justify-center items-center mb-3"
                  style={{ backgroundColor: item.color }}
                >
                  <Text className="text-2xl">{item.icon}</Text>
                </View>
                <Text className="text-base font-semibold text-gray-800 mb-2 text-center">
                  {item.title}
                </Text>
                <Text className="text-xs text-gray-500 text-center leading-4">
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 最近活动 */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-xl font-bold text-gray-800">最近活動</Text>
            <TouchableOpacity
              onPress={handleClearRecentPublish}
              disabled={recentPublishes.length === 0}
              className={`px-3 py-1.5 rounded-full ${
                recentPublishes.length > 0 ? "bg-gray-200" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  recentPublishes.length > 0 ? "text-gray-800" : "text-gray-400"
                }`}
              >
                清除
              </Text>
            </TouchableOpacity>
          </View>
          <View className="bg-white rounded-2xl p-5">
            {recentPublishes.length === 0 ? (
              <Text className="text-sm text-gray-500">
                尚無最近發布結果。請前往「發布通知」頁發布一則通知。
              </Text>
            ) : (
              <View className="gap-3">
                {recentPublishes.map((item, index) => (
                  <View
                    key={item.ID}
                    className="border-b border-gray-100 pb-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-gray-900">
                        發布紀錄 #{index + 1}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {formatPublishTime(item.PublishedAt)}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-600 mt-2">
                      地點：{item.LocationName}
                    </Text>
                    <Text className="text-xs text-gray-600 mt-1">
                      提示：{item.HintMessage}
                    </Text>
                    <Text className="text-xs text-gray-700 mt-1 font-medium">
                      成功 {item.TotalSent} / 失敗 {item.TotalFailed}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        {/* <TouchableOpacity
          className="bg-blue-500 rounded-md p-2"
          onPress={async () => await authApi.testAuth()}
        >
          <Text className="text-white">測試帶權限請求</Text>
        </TouchableOpacity> */}
      </ScrollView>

      {/* 用户菜单下拉框 */}
      <Modal
        visible={showUserMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <Pressable
          className="flex-1 bg-black/50"
          onPress={() => setShowUserMenu(false)}
        >
          <View className="flex-1 justify-start pt-20">
            <View className="mx-6 bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* 用户信息 */}
              <View className="p-4 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-gray-200 justify-center items-center mr-4">
                    <Text className="text-2xl font-bold text-gray-600">
                      {user?.name?.charAt(0) || "攤"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-800">
                      {user?.name || "攤車商家"}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {user?.email || "user@example.com"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 菜单选项 */}
              <View className="py-2">
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 active:bg-gray-50"
                  onPress={() => {
                    setShowUserMenu(false);
                    router.push("/vendor/profile");
                  }}
                >
                  <Text className="text-lg mr-3">👤</Text>
                  <Text className="text-base text-gray-700">個人資料</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 active:bg-gray-50"
                  onPress={() => {
                    setShowUserMenu(false);
                    // 可以添加设置页面路由
                  }}
                >
                  <Text className="text-lg mr-3">⚙️</Text>
                  <Text className="text-base text-gray-700">設定</Text>
                </TouchableOpacity>

                <View className="border-t border-gray-100 my-2" />

                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 active:bg-red-50"
                  onPress={async () => {
                    setShowUserMenu(false);
                    await handleLogout();
                  }}
                >
                  <Text className="text-lg mr-3">🚪</Text>
                  <Text className="text-base text-red-600 font-medium">
                    登出
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
