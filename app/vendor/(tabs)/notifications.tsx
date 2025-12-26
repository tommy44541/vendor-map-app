import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
import { useAuth } from "../../../contexts/AuthContext";
import { merchantApi, MerchantLocation } from "../../../services/api/merchant";
import {
  notificationApi,
  PublishLocationNotificationData,
} from "../../../services/api/notification";

type PublishMode = "saved" | "temp";

const Notifications = () => {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<PublishMode>("saved");
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [locations, setLocations] = useState<MerchantLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [hintMessage, setHintMessage] = useState("");
  const [lastPublished, setLastPublished] =
    useState<PublishLocationNotificationData | null>(null);

  const [tempLocationName, setTempLocationName] = useState("");
  const [tempFullAddress, setTempFullAddress] = useState("");
  const [tempLatitude, setTempLatitude] = useState("");
  const [tempLongitude, setTempLongitude] = useState("");
  const [isGettingTempLocation, setIsGettingTempLocation] = useState(false);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return locations.find((l) => l.ID === selectedLocationId) || null;
  }, [locations, selectedLocationId]);

  const handleAuthExpired = () => {
    Alert.alert("登錄已過期", "請重新登入後再試", [
      {
        text: "確定",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const loadLocations = async () => {
    try {
      setIsLoadingLocations(true);
      const res = await merchantApi.getMerchantLocations();
      if (!res.success) {
        Alert.alert("錯誤", res.message || "獲取位置列表失敗");
        return;
      }
      const list = Array.isArray(res.data) ? res.data : [];
      setLocations(list);
      if (
        selectedLocationId &&
        !list.some((l) => l.ID === selectedLocationId)
      ) {
        setSelectedLocationId(null);
      }
    } catch (error: any) {
      console.error("獲取位置列表失敗:", error);
      if (error.message?.includes("Token已過期且無法刷新")) {
        handleAuthExpired();
      } else {
        Alert.alert("錯誤", "獲取位置列表失敗，請重試");
      }
    } finally {
      setIsLoadingLocations(false);
    }
  };

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillTempWithCurrentLocation = async () => {
    try {
      setIsGettingTempLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限被拒絕", "需要位置權限才能獲取當前位置");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const fullAddress = address[0]
        ? `${address[0].street || ""} ${address[0].streetNumber || ""}, ${
            address[0].city || ""
          }, ${address[0].region || ""} ${address[0].postalCode || ""}`
        : "";

      setTempLatitude(String(loc.coords.latitude));
      setTempLongitude(String(loc.coords.longitude));
      if (fullAddress) setTempFullAddress(fullAddress);
      if (!tempLocationName.trim()) setTempLocationName("臨時地點");
    } catch (error) {
      console.error("獲取當前位置失敗:", error);
      Alert.alert("錯誤", "獲取當前位置失敗，請重試");
    } finally {
      setIsGettingTempLocation(false);
    }
  };

  const publish = async () => {
    const msg = hintMessage.trim();
    if (!msg) {
      Alert.alert("提示", "請輸入提示訊息（hint message）");
      return;
    }

    if (mode === "saved") {
      if (!selectedLocationId) {
        Alert.alert("提示", "請先選擇一個已保存位置");
        return;
      }
    } else {
      const name = tempLocationName.trim();
      const addr = tempFullAddress.trim();
      const lat = Number(tempLatitude);
      const lng = Number(tempLongitude);

      if (!name) {
        Alert.alert("提示", "請輸入地點名稱（LocationName）");
        return;
      }
      if (!addr) {
        Alert.alert("提示", "請輸入完整地址（FullAddress）");
        return;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        Alert.alert("提示", "請輸入正確的經緯度（數字）");
        return;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        Alert.alert("提示", "經緯度範圍不正確（lat: -90~90, lng: -180~180）");
        return;
      }
    }

    try {
      setIsPublishing(true);
      const res =
        mode === "saved"
          ? await notificationApi.publishLocationNotification({
              address_id: selectedLocationId as string,
              hint_message: msg,
            })
          : await notificationApi.publishLocationNotification({
              location_data: {
                location_name: tempLocationName.trim(),
                full_address: tempFullAddress.trim(),
                latitude: Number(tempLatitude),
                longitude: Number(tempLongitude),
              },
              hint_message: msg,
            });

      if (!res.success) {
        Alert.alert("錯誤", res.message || "發布通知失敗");
        return;
      }

      setLastPublished(res.data);
      setHintMessage("");
      if (mode === "temp") {
        setTempLocationName("");
        setTempFullAddress("");
        setTempLatitude("");
        setTempLongitude("");
      }
      Alert.alert("成功", res.message || "已發布位置通知");
    } catch (error: any) {
      console.error("發布通知失敗:", error);
      if (error.message?.includes("Token已過期且無法刷新")) {
        handleAuthExpired();
      } else {
        Alert.alert("錯誤", "發布通知失敗，請重試");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const renderLocationItem = ({ item }: { item: MerchantLocation }) => {
    const isSelected = item.ID === selectedLocationId;
    return (
      <Pressable
        onPress={() => setSelectedLocationId(item.ID)}
        className={`border rounded-2xl p-4 mb-3 ${
          isSelected
            ? "border-[#FF6B6B] bg-[#FF6B6B]/5"
            : "border-gray-200 bg-white"
        }`}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <View
                className={`w-9 h-9 rounded-xl items-center justify-center ${
                  isSelected ? "bg-[#FF6B6B]/15" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name="location"
                  size={18}
                  color={isSelected ? "#FF6B6B" : "#6b7280"}
                />
              </View>
              <Text className="text-base font-semibold text-gray-900 flex-1">
                {item.Label}
              </Text>
              {item.IsPrimary && (
                <View className="bg-purple-100 px-2.5 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-purple-700">
                    主要
                  </Text>
                </View>
              )}
              <View
                className={`px-2.5 py-1 rounded-full ${
                  item.IsActive ? "bg-green-100" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    item.IsActive ? "text-green-700" : "text-gray-700"
                  }`}
                >
                  {item.IsActive ? "啟用" : "停用"}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>
              {item.FullAddress}
            </Text>
          </View>
          <Ionicons
            name={isSelected ? "checkmark-circle" : "chevron-forward"}
            size={20}
            color={isSelected ? "#FF6B6B" : "#9ca3af"}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      edges={["left", "right", "bottom"]}
    >
      {/* 頂部漸層 Header（與 vendor/consumer Home 風格一致） */}
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
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-extrabold text-white">
              發布位置通知
            </Text>
            <Text className="text-sm text-white/85 mt-1">
              選擇已保存位置或輸入臨時地點，輸入提示訊息後發布給追蹤者。
            </Text>
          </View>
        </View>

        {/* 模式切換（Seg control） */}
        <View className="mt-5 bg-white/20 rounded-2xl p-1 flex-row">
          <Pressable
            onPress={() => setMode("saved")}
            disabled={isPublishing}
            className={`flex-1 rounded-xl px-3 py-3 flex-row items-center justify-center gap-2 ${
              mode === "saved" ? "bg-white" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="bookmark"
              size={16}
              color={mode === "saved" ? "#FF6B6B" : "#ffffff"}
            />
            <Text
              className={`font-semibold ${
                mode === "saved" ? "text-[#FF6B6B]" : "text-white"
              }`}
            >
              已保存
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("temp")}
            disabled={isPublishing}
            className={`flex-1 rounded-xl px-3 py-3 flex-row items-center justify-center gap-2 ${
              mode === "temp" ? "bg-white" : "bg-transparent"
            }`}
          >
            <Ionicons
              name="navigate"
              size={16}
              color={mode === "temp" ? "#FF6B6B" : "#ffffff"}
            />
            <Text
              className={`font-semibold ${
                mode === "temp" ? "text-[#FF6B6B]" : "text-white"
              }`}
            >
              臨時
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* 已保存位置區 */}
          <View className="bg-white border border-gray-200 rounded-3xl p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                  <Ionicons name="location" size={18} color="#6b7280" />
                </View>
                <View>
                  <Text className="text-base font-bold text-gray-900">
                    位置
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {mode === "saved"
                      ? "選擇一個已保存位置"
                      : "臨時模式下不需要選擇"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                className={`px-3 py-2 rounded-xl flex-row items-center gap-1 ${
                  isLoadingLocations || isPublishing
                    ? "bg-gray-100"
                    : "bg-gray-100"
                }`}
                onPress={loadLocations}
                disabled={isLoadingLocations || isPublishing}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={14} color="#374151" />
                <Text className="text-xs text-gray-800 font-semibold">
                  {isLoadingLocations ? "刷新中" : "刷新"}
                </Text>
              </TouchableOpacity>
            </View>

            {mode !== "saved" ? (
              <View className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <Text className="text-sm text-gray-700 leading-5">
                  你正在使用「臨時地點」模式，發布時會以你填寫的地點資訊為準。
                </Text>
              </View>
            ) : isLoadingLocations && locations.length === 0 ? (
              <View className="py-6 items-center">
                <ActivityIndicator />
                <Text className="text-sm text-gray-600 mt-2">載入中...</Text>
              </View>
            ) : locations.length === 0 ? (
              <View className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <Text className="text-sm text-gray-700 leading-5">
                  目前沒有可用位置。請先到「地點」頁新增並保存位置。
                </Text>
              </View>
            ) : (
              <View className="mt-4" style={{ maxHeight: 300 }}>
                <FlatList
                  data={locations}
                  keyExtractor={(item) => item.ID}
                  renderItem={renderLocationItem}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                />
              </View>
            )}

            {/* 已選位置摘要 */}
            {mode === "saved" && (
              <View className="mt-2">
                <View className="flex-row items-center gap-2 mt-2">
                  <Text className="text-sm font-semibold text-gray-800">
                    已選：
                  </Text>
                  <View className="flex-1">
                    {selectedLocation ? (
                      <Text className="text-sm font-semibold text-gray-900">
                        {selectedLocation.Label}
                      </Text>
                    ) : (
                      <Text className="text-sm text-gray-500">尚未選擇</Text>
                    )}
                  </View>
                </View>
                {selectedLocation?.FullAddress ? (
                  <Text
                    className="text-xs text-gray-500 mt-1"
                    numberOfLines={2}
                  >
                    {selectedLocation.FullAddress}
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          {/* 臨時地點資訊 */}
          {mode === "temp" && (
            <View className="mt-4 bg-white border border-gray-200 rounded-3xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                    <Ionicons name="navigate" size={18} color="#6b7280" />
                  </View>
                  <View>
                    <Text className="text-base font-bold text-gray-900">
                      臨時地點資訊
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      可使用目前位置自動填入經緯度與地址
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  className={`px-3 py-2 rounded-xl flex-row items-center gap-1 ${
                    isGettingTempLocation || isPublishing
                      ? "bg-gray-100"
                      : "bg-gray-100"
                  }`}
                  onPress={fillTempWithCurrentLocation}
                  disabled={isGettingTempLocation || isPublishing}
                  activeOpacity={0.85}
                >
                  {isGettingTempLocation ? (
                    <ActivityIndicator />
                  ) : (
                    <Ionicons name="locate" size={14} color="#374151" />
                  )}
                  <Text className="text-xs text-gray-800 font-semibold">
                    {isGettingTempLocation ? "取得中" : "使用當前位置"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mt-4">
                <Text className="text-sm text-gray-700 mb-2">地點名稱</Text>
                <TextInput
                  value={tempLocationName}
                  onChangeText={setTempLocationName}
                  placeholder="例如：快閃攤位 / 活動現場"
                  className="border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 bg-gray-50"
                  editable={!isPublishing}
                />

                <Text className="text-sm text-gray-700 mt-3 mb-2">
                  完整地址
                </Text>
                <TextInput
                  value={tempFullAddress}
                  onChangeText={setTempFullAddress}
                  placeholder="例如：台北市中正區..."
                  className="border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 bg-gray-50"
                  editable={!isPublishing}
                  multiline
                />

                <View className="flex-row gap-3 mt-3">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-700 mb-2">緯度</Text>
                    <TextInput
                      value={tempLatitude}
                      onChangeText={setTempLatitude}
                      placeholder="25.0478"
                      className="border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 bg-gray-50"
                      editable={!isPublishing}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-700 mb-2">經度</Text>
                    <TextInput
                      value={tempLongitude}
                      onChangeText={setTempLongitude}
                      placeholder="121.5170"
                      className="border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 bg-gray-50"
                      editable={!isPublishing}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 通知內容 */}
          <View className="mt-4 bg-white border border-gray-200 rounded-3xl p-4">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                <Ionicons
                  name="chatbubble-ellipses"
                  size={18}
                  color="#6b7280"
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  提示訊息
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  建議包含優惠、營業時間或現場提醒（例：只到 18:00）
                </Text>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-gray-100">
                <Text className="text-xs text-gray-700 font-semibold">
                  {hintMessage.trim().length} 字
                </Text>
              </View>
            </View>

            <TextInput
              value={hintMessage}
              onChangeText={setHintMessage}
              placeholder="例如：今天有特價活動，歡迎來店！"
              className="mt-4 border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 bg-gray-50"
              editable={!isPublishing}
              multiline
            />

            {/* 發布按鈕 */}
            <TouchableOpacity
              className="mt-4 rounded-2xl overflow-hidden"
              onPress={publish}
              disabled={isPublishing}
              activeOpacity={0.9}
            >
              {isPublishing ? (
                <View className="bg-gray-400 p-4 items-center">
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <LinearGradient
                  colors={["#FF6B6B", "#FF8E53"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 16, alignItems: "center" }}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="megaphone" size={18} color="#fff" />
                    <Text className="text-white font-bold">
                      {mode === "saved"
                        ? "發布通知（已保存位置）"
                        : "發布通知（臨時地點）"}
                    </Text>
                  </View>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>

          {/* 最近一次發布結果 */}
          {lastPublished && (
            <View className="mt-4 bg-white border border-gray-200 rounded-3xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                    <Ionicons name="stats-chart" size={18} color="#6b7280" />
                  </View>
                  <Text className="text-base font-bold text-gray-900">
                    最近一次發布結果
                  </Text>
                </View>
                <View className="px-3 py-1 rounded-full bg-gray-100">
                  <Text className="text-xs font-semibold text-gray-700">
                    {lastPublished.Status}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3 mt-4">
                <View className="flex-1 bg-green-50 border border-green-100 rounded-2xl p-4">
                  <Text className="text-xs text-green-700 font-semibold">
                    發送成功
                  </Text>
                  <Text className="text-2xl font-extrabold text-green-800 mt-1">
                    {lastPublished.TotalSent}
                  </Text>
                </View>
                <View className="flex-1 bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <Text className="text-xs text-rose-700 font-semibold">
                    發送失敗
                  </Text>
                  <Text className="text-2xl font-extrabold text-rose-800 mt-1">
                    {lastPublished.TotalFailed}
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row items-center gap-2">
                <Ionicons name="time" size={14} color="#6b7280" />
                <Text className="text-xs text-gray-500">
                  UpdatedAt：{lastPublished.UpdatedAt}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Notifications;
