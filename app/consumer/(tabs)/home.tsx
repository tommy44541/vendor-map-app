import { subscriptionsApi } from "@/services/api/subscriptions";
import { ApiError } from "@/services/api/util";
import { getFcmTokenOrNull, getStableDeviceId } from "@/utils/push";
import { parseMerchantIdFromQrData } from "@/utils/qr/subscriptionQr";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getMerchantDisplayName } from "@/utils/merchant/getMerchantDisplayName";
import { useAuth } from "../../../contexts/AuthContext";

type SubscriptionVendor = {
  id: string;
  name: string;
  cuisine: string;
  meta: string;
  statusLabel: string;
};

export default function ConsumerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [subLoading, setSubLoading] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [subscribedVendors, setSubscribedVendors] = useState<SubscriptionVendor[]>(
    []
  );

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
      router.replace("/");
    } catch (error) {
      console.error("登出失敗:", error);
    }
  };

  const getDeviceInfoOrNull = async () => {
    const [d, t] = await Promise.all([
      getStableDeviceId(),
      getFcmTokenOrNull(),
    ]);
    if (!d || !t) return null;
    return { device_id: d, fcm_token: t, platform: Platform.OS };
  };

  const subscribeWithQrData = async (rawQr: string) => {
    const raw = String(rawQr || "").trim();
    if (!raw) {
      Alert.alert("無法訂閱", "掃描到的內容是空的，請重試");
      return;
    }

    const deviceInfo = await getDeviceInfoOrNull();
    if (!deviceInfo) {
      Alert.alert(
        "尚未完成推播設定",
        "請先到「個人」頁面完成推播權限/註冊後再訂閱，才能收到通知。",
        [
          { text: "取消", style: "cancel" },
          { text: "前往個人", onPress: () => router.push("/consumer/profile") },
        ],
      );
      return;
    }

    const merchantFromQr = parseMerchantIdFromQrData(raw);
    const merchantFallback =
      !merchantFromQr && raw.length <= 80 && !raw.includes("://") ? raw : null;
    const merchant = merchantFromQr || merchantFallback;

    if (merchant) {
      await subscriptionsApi.subscribeMerchant({
        merchant_id: merchant,
        device_info: deviceInfo,
      });
      return;
    }

    await subscriptionsApi.processQRSubscription({
      qr_data: raw,
      device_info: deviceInfo,
    });
  };

  const onScanSubscribe = async (rawQr: string) => {
    try {
      setSubLoading(true);
      await subscribeWithQrData(rawQr);
      await loadSubscribedVendors();
      Alert.alert("成功", "已完成訂閱");
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "TOKEN_EXPIRED") {
        Alert.alert("登入已過期", "請重新登入後再試");
        return;
      }
      Alert.alert("錯誤", e?.message || "訂閱失敗");
    } finally {
      setSubLoading(false);
    }
  };

  const onManualSubscribe = async () => {
    const mId = merchantId.trim();
    if (!mId) {
      Alert.alert("提示", "請輸入 merchant_id");
      return;
    }
    await onScanSubscribe(mId);
    setMerchantId("");
  };

  const loadSubscribedVendors = async () => {
    try {
      setSubscriptionsLoading(true);
      const res = await subscriptionsApi.getSubscriptions();
      const list = Array.isArray(res.data) ? res.data : [];
      const activeList = list.filter((item) => item?.is_active);

      setSubscribedVendors(
        activeList.map((item) => ({
          id: String(item.merchant_id || ""),
          name: getMerchantDisplayName(item) || "已訂閱攤商",
          cuisine: "已訂閱通知中",
          meta:
            typeof item.notification_radius === "number"
              ? `通知半徑 ${item.notification_radius}m`
              : "已啟用通知",
          statusLabel: "通知中",
        }))
      );
    } catch (e) {
      console.warn("load subscribed vendors failed:", e);
      setSubscribedVendors([]);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribedVendors();
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      {/* 頂部搜索欄 */}
      <LinearGradient
        colors={["#4ECDC4", "#44A08D"]}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 10,
          paddingHorizontal: 10,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View className="flex-row justify-between items-center mb-3">
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
      </LinearGradient>

      {/* 主要內容區域 */}
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* 訂閱攤商（掃碼） */}
        <View className="mb-8">
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200 p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center">
                  <Ionicons name="qr-code" size={18} color="#111827" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">
                    訂閱攤商通知
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    掃描攤商提供的 QR Code 即可訂閱（建議先完成推播設定）
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setManualMode((v) => !v)}
                className="px-3 py-2 rounded-xl bg-gray-100"
                disabled={subLoading}
              >
                <Text className="text-xs font-semibold text-gray-800">
                  {manualMode ? "收起" : "手動"}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row gap-3 mt-4">
              <Pressable
                onPress={async () => {
                  if (subLoading) return;
                  setScanned(false);
                  setScannerOpen(true);
                  if (!cameraPermission?.granted) {
                    await requestCameraPermission();
                  }
                }}
                disabled={subLoading}
                className={`flex-1 rounded-xl py-3 items-center ${
                  subLoading ? "bg-gray-300" : "bg-green-600"
                }`}
              >
                {subLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">掃碼訂閱</Text>
                )}
              </Pressable>
            </View>

            {manualMode ? (
              <View className="mt-4">
                <TextInput
                  value={merchantId}
                  onChangeText={setMerchantId}
                  placeholder="merchant_id"
                  autoCapitalize="none"
                  editable={!subLoading}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-gray-50"
                />
                <Pressable
                  onPress={onManualSubscribe}
                  disabled={subLoading}
                  className={`mt-3 rounded-xl py-3 items-center ${
                    subLoading ? "bg-gray-300" : "bg-blue-600"
                  }`}
                >
                  <Text className="text-white font-semibold">訂閱（手動）</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {/* 已訂閱攤車 */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-xl font-bold text-gray-800">已訂閱攤車</Text>
            <TouchableOpacity
              onPress={() => router.push("/consumer/favorites")}
            >
              <Text className="text-sm text-teal-500 font-medium">
                前往收藏
              </Text>
            </TouchableOpacity>
          </View>

          {subscriptionsLoading ? (
            <View className="bg-white rounded-2xl border border-gray-200 p-5 items-center">
              <ActivityIndicator color="#0f766e" />
              <Text className="text-sm text-gray-500 mt-3">載入已訂閱攤商中</Text>
            </View>
          ) : subscribedVendors.length === 0 ? (
            <View className="bg-white rounded-2xl border border-gray-200 p-5">
              <Text className="text-base font-semibold text-gray-900">
                目前還沒有已訂閱的攤車
              </Text>
              <Text className="text-sm text-gray-500 mt-2 leading-6">
                你可以先用上方掃碼功能訂閱攤商，之後這裡會直接顯示你關注的餐車。
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {subscribedVendors.map((vendor) => (
              <TouchableOpacity
                key={vendor.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
                onPress={() =>
                  router.push({
                    pathname: "/consumer/vendor/[id]",
                    params: {
                      id: vendor.id,
                      name: vendor.name,
                      cuisine: vendor.cuisine,
                      is_open: "true",
                    },
                  })
                }
                activeOpacity={0.8}
              >
                <View className="p-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-lg font-bold text-gray-800 flex-1 mr-3">
                      {vendor.name}
                    </Text>
                    <View
                      className="px-2 py-1 rounded-full bg-teal-500"
                    >
                      <Text className="text-white text-xs font-medium">
                        {vendor.statusLabel}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-gray-500 mb-3">
                    {vendor.cuisine}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View className="px-2.5 py-1 rounded-full bg-teal-50">
                      <Text className="text-xs font-semibold text-teal-700">
                        {vendor.meta}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 附近攤車地圖入口 */}
        {/* <View className="mb-8">
          <TouchableOpacity
            className="rounded-2xl overflow-hidden"
            onPress={() => router.push("/consumer/location")}
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
                  設定個人位置後可讓攤車通知您
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View> */}
      </ScrollView>

      <Modal
        visible={scannerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setScannerOpen(false)}
      >
        <SafeAreaView
          className="flex-1 bg-black"
          edges={["left", "right", "top", "bottom"]}
        >
          {cameraPermission?.granted ? (
            <View className="flex-1">
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={async (result) => {
                  if (scanned) return;
                  const data = (result as any)?.data;
                  if (!data) return;
                  setScanned(true);
                  setScannerOpen(false);
                  await onScanSubscribe(String(data));
                }}
              />
              <View
                className="absolute left-0 right-0 z-20 px-4"
                pointerEvents="box-none"
                style={{ top: insets.top + 12 }}
              >
                <View className="flex-row items-center justify-between">
                  <Pressable
                    onPress={() => setScannerOpen(false)}
                    hitSlop={12}
                    className="w-11 h-11 rounded-2xl bg-black/40 border border-white/15 items-center justify-center"
                  >
                    <Ionicons name="close" size={22} color="#fff" />
                  </Pressable>
                  <View className="px-4 py-2 rounded-full bg-black/35 border border-white/10">
                    <Text className="text-white font-semibold text-sm">
                      掃描訂閱 QR
                    </Text>
                  </View>
                  <View className="w-11 h-11" />
                </View>
              </View>
              <View className="absolute left-0 right-0 bottom-0 z-20 px-6 pb-10">
                <View className="bg-black/55 border border-white/10 rounded-2xl p-4">
                  <Text className="text-white font-semibold">
                    對準攤商提供的 QR Code
                  </Text>
                  <Text className="text-white/80 text-xs mt-1 leading-5">
                    掃描成功後會自動完成訂閱並返回首頁。
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <Ionicons name="camera" size={44} color="#fff" />
              <Text className="text-white text-lg font-bold mt-4">
                需要相機權限
              </Text>
              <Text className="text-white/80 text-sm mt-2 text-center leading-6">
                允許相機權限後，才能掃描攤商的訂閱 QR Code。
              </Text>
              <Pressable
                onPress={requestCameraPermission}
                className="mt-5 bg-white rounded-2xl px-5 py-3"
              >
                <Text className="text-gray-900 font-semibold">允許相機</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>

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
