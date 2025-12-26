import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { deviceApi, GetDevicesData } from "../../../services/api/device";
import {
  getRegistrationCache,
  getStableDeviceId,
  onUserAuthenticated,
} from "../../../utils/push";

const normalizePlatform = () => {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return Platform.OS;
};

const Profile = () => {
  const [localDeviceId, setLocalDeviceId] = useState<string>("");
  const [fcmToken, setFcmToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<GetDevicesData[]>([]);
  const [cacheSummary, setCacheSummary] = useState<string>("");

  const platform = useMemo(() => normalizePlatform(), []);

  const refreshCache = useCallback(async () => {
    const cache = await getRegistrationCache();
    setCacheSummary(JSON.stringify(cache, null, 2));
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await deviceApi.getDevices();
      if (!res.success) {
        Alert.alert("錯誤", res.message || "取得裝置列表失敗");
        return;
      }
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      console.error("取得裝置列表失敗:", error);
      if (error.message?.includes("Token已過期且無法刷新")) {
        Alert.alert("登入已過期", "請重新登入後再試");
      } else {
        Alert.alert("錯誤", "取得裝置列表失敗，請稍後重試");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const id = await getStableDeviceId();
      setLocalDeviceId(id || "");
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
      const res = await deviceApi.registerDevice({
        device_id: localDeviceId,
        device_type: platform,
        device_token: fcmToken.trim(),
      });

      if (!res.success) {
        Alert.alert("註冊失敗", res.message || "Device 註冊失敗");
        return;
      }

      Alert.alert("成功", res.message || "Device registered successfully");
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
        const res = await deviceApi.updateDevice(deviceServerId, {
          fcm_token: fcmToken.trim(),
        });
        if (!res.success) {
          Alert.alert("更新失敗", res.message || "更新 FCM token 失敗");
          return;
        }
        Alert.alert("成功", res.message || "FCM token updated successfully");
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
              const res = await deviceApi.deleteDevice(deviceServerId);
              if (!res.success) {
                Alert.alert("停用失敗", res.message || "停用裝置失敗");
                return;
              }
              Alert.alert(
                "成功",
                res.message || "Device deactivated successfully"
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Profile</Text>

      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 12,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          裝置管理（Device）
        </Text>

        <View style={{ gap: 6 }}>
          <Text style={{ color: "#374151" }}>本機 device_id</Text>
          <Text
            selectable
            style={{
              fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              color: "#111827",
            }}
          >
            {localDeviceId || "載入中..."}
          </Text>
          <Text style={{ color: "#6B7280" }}>platform: {platform}</Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ color: "#374151" }}>
            FCM Token（或你後端期待的推播 token）
          </Text>
          <TextInput
            value={fcmToken}
            onChangeText={setFcmToken}
            placeholder="貼上 token..."
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#111827",
            }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={handleRegister}
            disabled={isLoading}
            style={{
              backgroundColor: "#111827",
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              opacity: isLoading ? 0.6 : 1,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              註冊本機裝置
            </Text>
          </Pressable>

          <Pressable
            onPress={loadDevices}
            disabled={isLoading}
            style={{
              backgroundColor: "#F3F4F6",
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              opacity: isLoading ? 0.6 : 1,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "600" }}>
              刷新列表
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={async () => {
              try {
                setIsLoading(true);
                const res = await onUserAuthenticated();
                if (!res.ok) {
                  Alert.alert("未完成註冊", `停在步驟：${res.step}`);
                } else {
                  Alert.alert(
                    "完成",
                    "已觸發自動註冊流程（請查看 cache 與列表）"
                  );
                }
                await refreshCache();
                await loadDevices();
              } catch (e: any) {
                console.error(e);
                Alert.alert("錯誤", e?.message || "觸發自動註冊流程失敗");
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            style={{
              backgroundColor: "#10B981",
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              opacity: isLoading ? 0.6 : 1,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              依規格自動註冊（Debug）
            </Text>
          </Pressable>

          <Pressable
            onPress={refreshCache}
            disabled={isLoading}
            style={{
              backgroundColor: "#F3F4F6",
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              opacity: isLoading ? 0.6 : 1,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "600" }}>
              刷新 Cache
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 6 }}>
            <ActivityIndicator />
          </View>
        ) : null}
      </View>

      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 12,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          本地註冊狀態快取（Debug）
        </Text>
        <Text
          selectable
          style={{
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            color: "#111827",
          }}
        >
          {cacheSummary || "（尚無）"}
        </Text>
      </View>

      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 12,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>我的裝置列表</Text>

        {devices.length === 0 ? (
          <Text style={{ color: "#6B7280" }}>目前沒有裝置紀錄</Text>
        ) : (
          devices.map((d) => (
            <View
              key={d.ID}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                padding: 12,
                gap: 8,
              }}
            >
              <Text style={{ fontWeight: "700" }}>ID: {d.ID}</Text>
              <Text style={{ color: "#374151" }}>DeviceID: {d.DeviceID}</Text>
              <Text style={{ color: "#374151" }}>Platform: {d.Platform}</Text>
              <Text style={{ color: "#374151" }}>
                Active: {String(d.IsActive)}
              </Text>
              <Text style={{ color: "#6B7280" }}>UpdatedAt: {d.UpdatedAt}</Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => handleUpdateToken(d.ID)}
                  disabled={isLoading}
                  style={{
                    backgroundColor: "#2563EB",
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    opacity: isLoading ? 0.6 : 1,
                    flex: 1,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    更新 Token
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleDeactivate(d.ID)}
                  disabled={isLoading}
                  style={{
                    backgroundColor: "#DC2626",
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    opacity: isLoading ? 0.6 : 1,
                    flex: 1,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    停用
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default Profile;
