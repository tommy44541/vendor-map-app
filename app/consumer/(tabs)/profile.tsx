import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { deviceApi, GetDevicesData } from "../../../services/api/device";
import { ApiError } from "../../../services/api/util";
import * as Device from "expo-device";
import {
  getRegistrationCache,
  getFcmTokenOrNull,
  getPushPermissionStatus,
  getStableDeviceId,
  onUserAuthenticated,
} from "../../../utils/push";

const normalizePlatform = () => {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return Platform.OS;
};

const shortText = (v: string, head = 14, tail = 10) => {
  const s = String(v || "");
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
};

function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "danger" | "warning";
}) {
  const cls =
    tone === "success"
      ? "bg-green-100"
      : tone === "danger"
        ? "bg-rose-100"
        : tone === "warning"
          ? "bg-amber-100"
          : "bg-gray-100";
  const textCls =
    tone === "success"
      ? "text-green-700"
      : tone === "danger"
        ? "text-rose-700"
        : tone === "warning"
          ? "text-amber-700"
          : "text-gray-700";
  return (
    <View className={`${cls} px-2.5 py-1 rounded-full`}>
      <Text className={`text-xs font-semibold ${textCls}`}>{label}</Text>
    </View>
  );
}

const Profile = () => {
  const insets = useSafeAreaInsets();
  const [permission, setPermission] = useState<string>("unknown");
  const [localDeviceId, setLocalDeviceId] = useState<string>("");
  const [fcmToken, setFcmToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<GetDevicesData[]>([]);
  const [cacheSummary, setCacheSummary] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFullToken, setShowFullToken] = useState(false);

  const platform = useMemo(() => normalizePlatform(), []);

  const refreshCache = useCallback(async () => {
    const cache = await getRegistrationCache();
    setCacheSummary(JSON.stringify(cache, null, 2));
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await deviceApi.getDevices();
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      console.error("取得裝置列表失敗:", error);
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        Alert.alert("登入已過期", "請重新登入後再試");
      } else {
        Alert.alert("錯誤", "取得裝置列表失敗，請稍後重試");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const p = await getPushPermissionStatus();
      setPermission(p);
      const [id, t] = await Promise.all([getStableDeviceId(), getFcmTokenOrNull()]);
      setLocalDeviceId(id || "");
      setFcmToken(t || "");
      await refreshCache();
      await loadDevices();
    })();
  }, [loadDevices, refreshCache]);

  const handleRegister = useCallback(async () => {
    if (!localDeviceId) {
      Alert.alert("提示", "尚未取得本機 device_id，請稍後再試");
      return;
    }
    if (!fcmToken.trim()) {
      Alert.alert("提示", "請先輸入 FCM Token（或你目前使用的推播 token）");
      return;
    }

    try {
      setIsLoading(true);
      await deviceApi.registerDevice({
        fcm_token: fcmToken.trim(),
        device_id: localDeviceId,
        platform: platform === "ios" ? "ios" : "android",
      });
      Alert.alert("成功", "Device registered successfully");
      await loadDevices();
      await refreshCache();
    } catch (error: any) {
      console.error("註冊裝置失敗:", error);
      Alert.alert("錯誤", "註冊裝置失敗，請稍後重試");
    } finally {
      setIsLoading(false);
    }
  }, [fcmToken, localDeviceId, loadDevices, platform, refreshCache]);

  const handleUpdateToken = useCallback(
    async (deviceServerId: string) => {
      if (!fcmToken.trim()) {
        Alert.alert("提示", "請先輸入新的 FCM Token");
        return;
      }
      try {
        setIsLoading(true);
        await deviceApi.updateDevice(deviceServerId, {
          fcm_token: fcmToken.trim(),
        });
        Alert.alert("成功", "FCM token updated successfully");
        await loadDevices();
        await refreshCache();
      } catch (error: any) {
        console.error("更新 FCM token 失敗:", error);
        Alert.alert("錯誤", "更新 FCM token 失敗，請稍後重試");
      } finally {
        setIsLoading(false);
      }
    },
    [fcmToken, loadDevices, refreshCache]
  );

  const handleDeactivate = useCallback(
    async (deviceServerId: string) => {
      Alert.alert("確認停用", "確定要停用此裝置嗎？", [
        { text: "取消", style: "cancel" },
        {
          text: "停用",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await deviceApi.deleteDevice(deviceServerId);
              Alert.alert(
                "成功",
                "Device deactivated successfully"
              );
              await loadDevices();
              await refreshCache();
            } catch (error: any) {
              console.error("停用裝置失敗:", error);
              Alert.alert("錯誤", "停用裝置失敗，請稍後重試");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    },
    [loadDevices, refreshCache]
  );

  const permissionMeta = useMemo(() => {
    const p = String(permission || "unknown");
    if (p === "granted") return { label: "已允許", tone: "success" as const };
    if (p === "denied") return { label: "已拒絕", tone: "danger" as const };
    if (p === "undetermined") return { label: "未決定", tone: "warning" as const };
    return { label: "未知", tone: "neutral" as const };
  }, [permission]);

  const currentDevice = useMemo(
    () => devices.find((item) => item.DeviceID === localDeviceId),
    [devices, localDeviceId]
  );

  const registrationMeta = useMemo(() => {
    if (currentDevice?.IsActive && fcmToken) {
      return {
        label: "已完成",
        tone: "success" as const,
        description: "這台裝置可以接收攤車通知。",
        actionLabel: "重新檢查通知設定",
      };
    }

    if (permission === "denied") {
      return {
        label: "未啟用",
        tone: "danger" as const,
        description: "你已拒絕通知權限，可能收不到攤車提醒。",
        actionLabel: "重新設定通知",
      };
    }

    if (permission === "granted") {
      return {
        label: "處理中",
        tone: "warning" as const,
        description: "通知權限已開啟，但這台裝置尚未完成綁定。",
        actionLabel: "完成通知設定",
      };
    }

    return {
      label: "未設定",
      tone: "neutral" as const,
      description: "完成通知設定後，才會在攤車出攤時收到提醒。",
      actionLabel: "開啟通知",
    };
  }, [currentDevice?.IsActive, fcmToken, permission]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["left", "right", "bottom"]}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 18,
          paddingHorizontal: 16,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-extrabold text-white">個人</Text>
            <Text className="text-sm text-white/85 mt-1">
              通知設定與帳號資訊
            </Text>
          </View>
          <Pressable
            onPress={async () => {
              try {
                setIsLoading(true);
                await Promise.all([refreshCache(), loadDevices()]);
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            className="w-10 h-10 rounded-2xl items-center justify-center bg-white/25"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="refresh" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, gap: 14 }}
      >
        <View className="bg-white border border-gray-200 rounded-3xl p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                <Ionicons name="notifications" size={18} color="#6b7280" />
              </View>
              <View>
                <Text className="text-base font-bold text-gray-900">通知設定</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  開啟後可收到已追蹤攤車的營業提醒
                </Text>
              </View>
            </View>
            <Badge label={registrationMeta.label} tone={registrationMeta.tone} />
          </View>

          <View className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">通知權限</Text>
              <Badge label={permissionMeta.label} tone={permissionMeta.tone} />
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">裝置綁定</Text>
              <Badge label={registrationMeta.label} tone={registrationMeta.tone} />
            </View>

            <Text className="mt-4 text-sm leading-6 text-gray-700">
              {registrationMeta.description}
            </Text>
          </View>

          <View className="flex-row gap-3 mt-4">
            <Pressable
              onPress={async () => {
                try {
                  setIsLoading(true);
                  const res = await onUserAuthenticated({
                    requestPermissionIfNeeded: true,
                  });
                  const [p, id, t] = await Promise.all([
                    getPushPermissionStatus(),
                    getStableDeviceId(),
                    getFcmTokenOrNull(),
                  ]);
                  setPermission(p);
                  setLocalDeviceId(id || "");
                  setFcmToken(t || "");
                  await Promise.all([refreshCache(), loadDevices()]);
                  Alert.alert("完成", res.ok ? "推播設定完成" : `未完成：${res.step}`);
                } catch (e: any) {
                  Alert.alert("錯誤", e?.message || "推播註冊失敗");
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className={`flex-1 rounded-2xl py-3 items-center ${
                isLoading ? "bg-gray-300" : "bg-blue-600"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">
                  {registrationMeta.actionLabel}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setShowAdvanced((v) => !v)}
              className={`rounded-2xl py-3 px-4 items-center ${
                showAdvanced ? "bg-gray-900" : "bg-gray-100"
              }`}
            >
              <Ionicons
                name={showAdvanced ? "close" : "construct-outline"}
                size={18}
                color={showAdvanced ? "#FFFFFF" : "#111827"}
              />
            </Pressable>
          </View>
        </View>

        <View className="bg-white border border-gray-200 rounded-3xl p-4">
          <Pressable
            onPress={() => setShowAdvanced((v) => !v)}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                <Ionicons name="code-slash" size={18} color="#6b7280" />
              </View>
              <View>
                <Text className="text-base font-bold text-gray-900">診斷資訊</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  裝置編號、token、快取與除錯工具
                </Text>
              </View>
            </View>
            <Ionicons
              name={showAdvanced ? "chevron-up" : "chevron-down"}
              size={18}
              color="#6b7280"
            />
          </Pressable>

          {showAdvanced ? (
            <View className="mt-4 gap-3">
              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-gray-500">platform</Text>
                  <Text className="text-xs text-gray-900 font-semibold">{platform}</Text>
                </View>

                <View className="mt-3">
                  <Text className="text-xs text-gray-500">device_id</Text>
                  <Text
                    selectable
                    className="text-xs text-gray-900 mt-2"
                    style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}
                    numberOfLines={2}
                  >
                    {localDeviceId || "(空)"}
                  </Text>
                </View>

                <View className="mt-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500">token</Text>
                    <Pressable
                      onPress={() => setShowFullToken((v) => !v)}
                      disabled={!fcmToken}
                      className={`px-2 py-1 rounded-full ${
                        fcmToken ? "bg-gray-200" : "bg-gray-100"
                      }`}
                    >
                      <Text className="text-[11px] text-gray-700 font-semibold">
                        {showFullToken ? "收起" : "展開"}
                      </Text>
                    </Pressable>
                  </View>
                  <Text
                    selectable
                    className="text-xs text-gray-900 mt-2"
                    style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}
                    numberOfLines={showFullToken ? undefined : 2}
                  >
                    {fcmToken ? (showFullToken ? fcmToken : shortText(fcmToken)) : "(空)"}
                  </Text>
                </View>
              </View>

              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <Text className="text-xs font-semibold text-gray-700 mb-2">
                  註冊快取
                </Text>
                <Text
                  selectable
                  className="text-xs text-gray-700"
                  style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}
                >
                  {cacheSummary || "(空)"}
                </Text>
              </View>

              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <Text className="text-xs font-semibold text-gray-700 mb-2">
                  手動註冊（除錯）
                </Text>
                <TextInput
                  value={fcmToken}
                  onChangeText={setFcmToken}
                  placeholder="貼上 token..."
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  className="border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 bg-white"
                />
                <Pressable
                  onPress={handleRegister}
                  disabled={isLoading}
                  className={`mt-3 rounded-2xl py-3 items-center ${
                    isLoading ? "bg-gray-300" : "bg-gray-900"
                  }`}
                >
                  <Text className="text-white font-semibold">手動註冊本機裝置</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    try {
                      setIsLoading(true);
                      const t = await getFcmTokenOrNull();
                      if (!t) {
                        const msg =
                          Platform.OS === "ios" && Device.isDevice === false
                            ? "iOS 模擬器無法取得 APNs token，也無法測真正遠端推播。請改用 iPhone 實機測試。"
                            : Platform.OS === "android"
                              ? "目前取不到 FCM token。請確認你用的是含 Google Play 的模擬器，且原生端已正確配置 FCM。"
                              : "目前取不到推播 token，請確認原生端推播設定是否正確。";
                        Alert.alert("找不到 Token", msg);
                        return;
                      }
                      setFcmToken(t);
                    } catch (e: any) {
                      Alert.alert("錯誤", e?.message || "取得 token 失敗");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className={`mt-3 rounded-2xl py-3 items-center ${
                    isLoading ? "bg-gray-200" : "bg-white border border-gray-200"
                  }`}
                >
                  <Text className="text-gray-900 font-semibold">重新取得 Token</Text>
                </Pressable>
              </View>

              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <Text className="text-xs font-semibold text-gray-700 mb-2">
                  我的裝置列表
                </Text>

                {devices.length === 0 ? (
                  <Text className="text-xs text-gray-600">（目前沒有）</Text>
                ) : (
                  <View className="gap-3">
                    {devices.map((d) => (
                      <View
                        key={d.ID}
                        className="bg-white border border-gray-200 rounded-2xl p-4"
                      >
                        <Text className="text-xs font-semibold text-gray-900">
                          ID: {d.ID}
                        </Text>
                        <Text className="text-xs text-gray-600 mt-2">
                          DeviceID: {d.DeviceID}
                        </Text>
                        <Text className="text-xs text-gray-600 mt-1">
                          Platform: {d.Platform}
                        </Text>
                        <Text className="text-xs text-gray-600 mt-1">
                          Active: {String(d.IsActive)}
                        </Text>
                        <Text className="text-[11px] text-gray-500 mt-2">
                          UpdatedAt: {d.UpdatedAt}
                        </Text>

                        <View className="flex-row gap-3 mt-3">
                          <Pressable
                            onPress={() => handleUpdateToken(d.ID)}
                            disabled={isLoading}
                            className={`flex-1 rounded-2xl py-2 items-center ${
                              isLoading ? "bg-gray-200" : "bg-blue-600"
                            }`}
                          >
                            <Text className="text-white font-semibold">更新 Token</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeactivate(d.ID)}
                            disabled={isLoading}
                            className={`flex-1 rounded-2xl py-2 items-center ${
                              isLoading ? "bg-gray-200" : "bg-rose-600"
                            }`}
                          >
                            <Text className="text-white font-semibold">停用</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
