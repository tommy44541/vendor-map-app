import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";

export default function ConsumerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 設置狀態欄樣式
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
      router.replace("/entry");
    } catch (error) {
      console.error("登出失敗:", error);
    }
  };

  const handleSearch = () => {
    // TODO: 搜尋功能
    // if (searchQuery.trim()) {
    //   router.push(
    //     `/consumer/search?q=${encodeURIComponent(searchQuery.trim())}`
    //   );
    // }
  };

  const categories = [
    { id: "all", name: "全部", icon: "🍽" },
    { id: "breakfast", name: "早餐", icon: "🌅" },
    { id: "lunch", name: "午餐", icon: "☀️" },
    { id: "dinner", name: "晚餐", icon: "🌙" },
    { id: "snack", name: "小吃", icon: "🍡" },
    { id: "drink", name: "飲品", icon: "🥤" },
  ];

  const featuredVendors = [
    {
      id: "1",
      name: "阿婆臭豆腐",
      rating: 4.8,
      distance: "0.3km",
      cuisine: "台灣小吃",
      image: "",
      isOpen: true,
    },
    {
      id: "2",
      name: "老王牛肉麵",
      rating: 4.6,
      distance: "0.5km",
      cuisine: "麵食",
      image: "",
      isOpen: true,
    },
    {
      id: "3",
      name: "小美珍珠奶茶",
      rating: 4.4,
      distance: "0.2km",
      cuisine: "飲品",
      image: "",
      isOpen: false,
    },
  ];

  const quickActions = [
    {
      id: "favorites",
      title: "我的收藏",
      icon: "❤️",
      color: "#FF6B6B",
      onPress: () => router.push("/consumer/favorites"),
    },
    {
      id: "orders",
      title: "訂單記錄",
      icon: "📋",
      color: "#4ECDC4",
      onPress: () => router.push("/consumer/orders"),
    },
    {
      id: "profile",
      title: "個人資料",
      icon: "👤",
      color: "#45B7D1",
      onPress: () => router.push("/consumer/profile"),
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* 頂部搜索欄 */}
      <LinearGradient
        colors={["#4ECDC4", "#44A08D"]}
        style={{
          paddingTop: 48,
          paddingBottom: 10,
          paddingHorizontal: 10,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            className="flex-row items-center flex-1"
            onPress={() => setShowUserMenu(true)}
            activeOpacity={0.8}
          >
            <View className="w-12 h-12 rounded-full bg-white/20 justify-center items-center mr-4">
              <Text className="text-2xl font-bold text-white">
                {user?.name?.charAt(0) || "用"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-white/80 mb-1">歡迎回來</Text>
              <Text className="text-xl font-bold text-white">
                {user?.name || "美食探索者"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 搜索欄 */}
        <View className="mt-2">
          <View className="flex-row bg-white rounded-full px-5 py-3 items-center">
            <TextInput
              className="flex-1 text-base text-gray-800"
              placeholder="搜尋美食攤車..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity className="ml-3" onPress={handleSearch}>
              <Text className="text-lg">🔍</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* 主要內容區域 */}
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* 快速功能 */}
        <View className="mb-8">
          <Text className="text-xl font-bold text-gray-800 mb-5">快速功能</Text>
          <View className="flex-row justify-between gap-4">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                className="flex-1 bg-white rounded-2xl p-5 items-center shadow-sm"
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <View
                  className="w-12 h-12 rounded-full justify-center items-center mb-3"
                  style={{ backgroundColor: action.color }}
                >
                  <Text className="text-2xl">{action.icon}</Text>
                </View>
                <Text className="text-sm font-semibold text-gray-800 text-center">
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 分類選擇 */}
        <View className="mb-8">
          <Text className="text-xl font-bold text-gray-800 mb-5">美食分類</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 24 }}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                className="items-center mr-6 min-w-20"
                activeOpacity={0.8}
              >
                <View className="w-15 h-15 rounded-full bg-white justify-center items-center mb-2 shadow-sm">
                  <Text className="text-2xl">{category.icon}</Text>
                </View>
                <Text className="text-xs text-gray-500 text-center">
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 推薦攤車 */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-xl font-bold text-gray-800">推薦攤車</Text>
            <TouchableOpacity
              onPress={() => router.push("/consumer/recommendations")}
            >
              <Text className="text-sm text-teal-500 font-medium">
                查看全部
              </Text>
            </TouchableOpacity>
          </View>
          <View className="space-y-4">
            {featuredVendors.map((vendor) => (
              <TouchableOpacity
                key={vendor.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
                onPress={() => router.push(`/consumer/vendor/${vendor.id}`)}
                activeOpacity={0.8}
              >
                {/* <Image source={vendor.image} className="w-full h-30" /> */}
                <View className="p-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-lg font-bold text-gray-800 flex-1 mr-3">
                      {vendor.name}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full ${
                        vendor.isOpen ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      <Text className="text-white text-xs font-medium">
                        {vendor.isOpen ? "營業中" : "已關閉"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-gray-500 mb-3">
                    {vendor.cuisine}
                  </Text>
                  <View className="flex-row gap-4">
                    <View className="flex-row items-center">
                      <Text className="text-sm mr-1">⭐</Text>
                      <Text className="text-sm text-gray-500">
                        {vendor.rating}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-sm mr-1">📍</Text>
                      <Text className="text-sm text-gray-500">
                        {vendor.distance}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 附近攤車地圖入口 */}
        <View className="mb-8">
          <TouchableOpacity
            className="rounded-2xl overflow-hidden"
            onPress={() => router.push("/consumer/map")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              className="p-6 items-center"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View className="items-center">
                <Text className="text-5xl mb-4">🗺️</Text>
                <Text className="text-xl font-bold text-white mb-2">
                  查看地圖
                </Text>
                <Text className="text-sm text-white/90 text-center">
                  在地圖上探索附近的攤車位置
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 用戶選單下拉框 */}
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
              {/* 用戶信息 */}
              <View className="p-4 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-gray-200 justify-center items-center mr-4">
                    <Text className="text-lg font-bold text-gray-600">
                      {user?.name?.charAt(0) || "用"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-800">
                      {user?.name || "美食探索者"}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {user?.email || "user@example.com"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 選單選項 */}
              <View className="py-2">
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 active:bg-gray-50"
                  onPress={() => {
                    setShowUserMenu(false);
                    router.push("/consumer/profile");
                  }}
                >
                  <Text className="text-lg mr-3">👤</Text>
                  <Text className="text-base text-gray-700">個人資料</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 active:bg-gray-50"
                  onPress={() => {
                    setShowUserMenu(false);
                    router.push("/consumer/favorites");
                  }}
                >
                  <Text className="text-lg mr-3">❤️</Text>
                  <Text className="text-base text-gray-700">我的收藏</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 active:bg-gray-50"
                  onPress={() => {
                    setShowUserMenu(false);
                    router.push("/consumer/orders");
                  }}
                >
                  <Text className="text-lg mr-3">📋</Text>
                  <Text className="text-base text-gray-700">訂單記錄</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 active:bg-gray-50"
                  onPress={() => {
                    setShowUserMenu(false);
                    // 可以添加設置頁面路由
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
