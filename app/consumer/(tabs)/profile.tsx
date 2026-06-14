import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelText,
  PixelTextInput,
} from "@/components/pixel";
import { deviceApi, GetDevicesData } from "@/services/api/device";
import { ApiError } from "@/services/api/util";
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import {
  getFcmTokenOrNull,
  getPushPermissionStatus,
  getRegistrationCache,
  getStableDeviceId,
  onUserAuthenticated,
} from "@/utils/push";
import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

type ChipTone = "green" | "red" | "gold" | "paper";

const Profile = () => {
  const insets = useSafeAreaInsets();
  const [permission, setPermission] = useState<string>("unknown");
  const [localDeviceId, setLocalDeviceId] = useState<string>("");
  const [fcmToken, setFcmToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<GetDevicesData[]>([]);
  const [cacheSummary, setCacheSummary] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDebugTools, setShowDebugTools] = useState(false);
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
        Alert.alert("錯誤", "取得裝置列表失敗,請稍後重試");
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
      const [id, t] = await Promise.all([
        getStableDeviceId(),
        getFcmTokenOrNull(),
      ]);
      setLocalDeviceId(id || "");
      setFcmToken(t || "");
      await refreshCache();
      await loadDevices();
    })();
  }, [loadDevices, refreshCache]);

  const handleRegister = useCallback(async () => {
    if (!localDeviceId) {
      Alert.alert("提示", "尚未取得本機 device_id,請稍後再試");
      return;
    }
    if (!fcmToken.trim()) {
      Alert.alert("提示", "請先輸入 FCM Token (或你目前使用的推播 token)");
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
      Alert.alert("錯誤", "註冊裝置失敗,請稍後重試");
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
        Alert.alert("錯誤", "更新 FCM token 失敗,請稍後重試");
      } finally {
        setIsLoading(false);
      }
    },
    [fcmToken, loadDevices, refreshCache]
  );

  const handleDeactivate = useCallback(
    async (deviceServerId: string) => {
      Alert.alert("確認停用", "確定要停用此裝置嗎?", [
        { text: "取消", style: "cancel" },
        {
          text: "停用",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await deviceApi.deleteDevice(deviceServerId);
              Alert.alert("成功", "Device deactivated successfully");
              await loadDevices();
              await refreshCache();
            } catch (error: any) {
              console.error("停用裝置失敗:", error);
              Alert.alert("錯誤", "停用裝置失敗,請稍後重試");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    },
    [loadDevices, refreshCache]
  );

  const permissionMeta = useMemo<{ label: string; tone: ChipTone }>(() => {
    const p = String(permission || "unknown");
    if (p === "granted") return { label: "已允許", tone: "green" };
    if (p === "denied") return { label: "已拒絕", tone: "red" };
    if (p === "undetermined") return { label: "未決定", tone: "gold" };
    return { label: "未知", tone: "paper" };
  }, [permission]);

  const currentDevice = useMemo(
    () => devices.find((item) => item.DeviceID === localDeviceId),
    [devices, localDeviceId]
  );

  const registrationMeta = useMemo<{
    label: string;
    tone: ChipTone;
    description: string;
    actionLabel: string;
    actionTone: "blue" | "gold" | "red";
  }>(() => {
    if (currentDevice?.IsActive && fcmToken) {
      return {
        label: "已完成",
        tone: "green",
        description: "這台裝置可以接收已追蹤商家的通知。",
        actionLabel: ">> 重新檢查通知設定",
        actionTone: "blue",
      };
    }

    if (permission === "denied") {
      return {
        label: "未啟用",
        tone: "red",
        description: "你已拒絕通知權限,可能收不到商家提醒。",
        actionLabel: "> 重新設定通知",
        actionTone: "red",
      };
    }

    if (permission === "granted") {
      return {
        label: "處理中",
        tone: "gold",
        description: "通知權限已開啟,但這台裝置尚未完成綁定。",
        actionLabel: "> 完成通知設定",
        actionTone: "gold",
      };
    }

    return {
      label: "未設定",
      tone: "paper",
      description: "完成通知設定後,才會在商家發布營業訊息時收到提醒。",
      actionLabel: "> 開啟通知",
      actionTone: "blue",
    };
  }, [currentDevice?.IsActive, fcmToken, permission]);

  return (
    <View style={styles.root}>
      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <PixelText variant="caption" tone="purple" display>
            ACCOUNT
          </PixelText>
          <PixelText variant="display">個人</PixelText>
          <View style={{ height: 4 }} />
          <PixelText variant="caption" tone="muted">
            通知設定與帳號資訊
          </PixelText>
        </View>
        <PixelButton
          label={isLoading ? "..." : ">> 重新整理"}
          tone="purple"
          size="sm"
          disabled={isLoading}
          onPress={async () => {
            try {
              setIsLoading(true);
              await Promise.all([refreshCache(), loadDevices()]);
            } finally {
              setIsLoading(false);
            }
          }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
          gap: 14,
        }}
      >
        {/* 通知設定 */}
        <PixelCard
          title="NOTIFY  SETUP"
          titleTone={
            registrationMeta.tone === "green"
              ? "green"
              : registrationMeta.tone === "red"
                ? "red"
                : "blue"
          }
          titleDisplay
          padding={14}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="notifications"
                size={18}
                color={pixelColors.ink}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText variant="bodyLg">通知設定</PixelText>
              <PixelText variant="caption" tone="muted">
                開啟後可收到已追蹤商家的營業提醒
              </PixelText>
            </View>
            <PixelChip
              label={registrationMeta.label}
              tone={registrationMeta.tone}
              active
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.miniRow}>
            <PixelText variant="caption" tone="muted">
              通知權限
            </PixelText>
            <PixelChip
              label={permissionMeta.label}
              tone={permissionMeta.tone}
              active
            />
          </View>
          <View style={{ height: 8 }} />
          <View style={styles.miniRow}>
            <PixelText variant="caption" tone="muted">
              裝置綁定
            </PixelText>
            <PixelChip
              label={registrationMeta.label}
              tone={registrationMeta.tone}
              active
            />
          </View>

          <View style={styles.divider} />

          <PixelText variant="body">{registrationMeta.description}</PixelText>

          <View style={{ height: 12 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <PixelButton
                label={isLoading ? "..." : registrationMeta.actionLabel}
                tone={registrationMeta.actionTone}
                fullWidth
                disabled={isLoading}
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
                    Alert.alert(
                      "完成",
                      res.ok ? "推播設定完成" : `未完成:${res.step}`
                    );
                  } catch (e: any) {
                    Alert.alert("錯誤", e?.message || "推播註冊失敗");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              />
            </View>
            <PixelButton
              label={showAdvanced ? "x" : "DEV"}
              tone={showAdvanced ? "ink" : "paper"}
              size="md"
              display
              onPress={() => setShowAdvanced((v) => !v)}
            />
          </View>
        </PixelCard>

        {/* 診斷資訊 */}
        <PixelCard
          title="DIAGNOSTICS"
          titleTone="purple"
          titleDisplay
          padding={14}
        >
          <Pressable
            onPress={() => setShowAdvanced((v) => !v)}
            style={styles.headerRow}
          >
            <View style={styles.headerIconAlt}>
              <Ionicons
                name="code-slash"
                size={18}
                color={pixelColors.ink}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText variant="bodyLg">診斷資訊</PixelText>
              <PixelText variant="caption" tone="muted">
                裝置編號、token、除錯工具
              </PixelText>
            </View>
            <PixelText variant="title" tone="gold" display>
              {showAdvanced ? "-" : "+"}
            </PixelText>
          </Pressable>

          {showAdvanced ? (
            <>
              {/* 裝置基本資訊 */}
              <View style={styles.divider} />
              <PixelText variant="caption" tone="gold" display>
                DEVICE  INFO
              </PixelText>
              <View style={{ height: 8 }} />

              <View style={styles.miniRow}>
                <PixelText variant="caption" tone="muted">
                  platform
                </PixelText>
                <PixelText variant="body">{platform}</PixelText>
              </View>

              <View style={{ height: 10 }} />
              <PixelText variant="caption" tone="muted">
                device_id
              </PixelText>
              <Text selectable style={styles.monoText} numberOfLines={2}>
                {localDeviceId || "(空)"}
              </Text>

              <View style={{ height: 10 }} />
              <View style={styles.miniRow}>
                <PixelText variant="caption" tone="muted">
                  token
                </PixelText>
                <PixelChip
                  label={showFullToken ? "收起" : "展開"}
                  tone="paper"
                  active={!!fcmToken}
                  onPress={() =>
                    fcmToken ? setShowFullToken((v) => !v) : null
                  }
                />
              </View>
              <Text
                selectable
                style={styles.monoText}
                numberOfLines={showFullToken ? undefined : 2}
              >
                {fcmToken
                  ? showFullToken
                    ? fcmToken
                    : shortText(fcmToken)
                  : "(空)"}
              </Text>

              {/* 我的裝置列表 */}
              <View style={styles.divider} />
              <View style={styles.miniRow}>
                <PixelText variant="caption" tone="blue" display>
                  MY  DEVICES
                </PixelText>
                <PixelChip
                  label={`${devices.length} 台`}
                  tone="paper"
                  active
                />
              </View>
              <View style={{ height: 8 }} />

              {devices.length === 0 ? (
                <PixelText variant="caption" tone="muted">
                  (目前沒有)
                </PixelText>
              ) : (
                <View style={{ gap: 10 }}>
                  {devices.map((d) => (
                    <View key={d.ID} style={styles.deviceBox}>
                      <View style={styles.miniRow}>
                        <PixelText variant="caption" tone="muted">
                          DeviceID
                        </PixelText>
                        <PixelChip
                          label={d.IsActive ? "啟用" : "停用"}
                          tone={d.IsActive ? "green" : "red"}
                          active
                        />
                      </View>
                      <Text selectable style={styles.monoText}>
                        {d.DeviceID}
                      </Text>

                      <View style={{ height: 8 }} />
                      <View style={styles.miniRow}>
                        <PixelText variant="caption" tone="muted">
                          Platform
                        </PixelText>
                        <PixelText variant="body">{d.Platform}</PixelText>
                      </View>

                      <View style={{ height: 4 }} />
                      <View style={styles.miniRow}>
                        <PixelText variant="caption" tone="muted">
                          UpdatedAt
                        </PixelText>
                        <Text
                          selectable
                          style={[styles.monoText, styles.monoRight]}
                          numberOfLines={1}
                        >
                          {d.UpdatedAt}
                        </Text>
                      </View>

                      <View style={{ height: 10 }} />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <PixelButton
                            label={isLoading ? "..." : "> 更新 Token"}
                            tone="blue"
                            fullWidth
                            disabled={isLoading}
                            onPress={() => handleUpdateToken(d.ID)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <PixelButton
                            label={isLoading ? "..." : "x 停用"}
                            tone="red"
                            fullWidth
                            disabled={isLoading}
                            onPress={() => handleDeactivate(d.ID)}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 除錯工具二級展開 */}
              <View style={styles.divider} />
              <Pressable
                style={styles.miniRow}
                onPress={() => setShowDebugTools((v) => !v)}
              >
                <PixelText variant="caption" tone="red" display>
                  DEBUG  TOOLS
                </PixelText>
                <PixelText variant="body" tone="gold" display>
                  {showDebugTools ? "-" : "+"}
                </PixelText>
              </Pressable>

              {showDebugTools ? (
                <>
                  <View style={{ height: 10 }} />
                  <PixelText variant="caption" tone="muted">
                    註冊快取
                  </PixelText>
                  <Text selectable style={styles.monoText}>
                    {cacheSummary || "(空)"}
                  </Text>

                  <View style={{ height: 12 }} />
                  <PixelTextInput
                    label="手動填入 FCM TOKEN"
                    placeholder="貼上 token..."
                    value={fcmToken}
                    onChangeText={setFcmToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <View style={{ height: 10 }} />
                  <PixelButton
                    label={isLoading ? "..." : "> 手動註冊本機裝置"}
                    tone="ink"
                    fullWidth
                    disabled={isLoading}
                    onPress={handleRegister}
                  />
                  <View style={{ height: 8 }} />
                  <PixelButton
                    label={isLoading ? "..." : ">> 重新取得 Token"}
                    tone="paper"
                    fullWidth
                    disabled={isLoading}
                    onPress={async () => {
                      try {
                        setIsLoading(true);
                        const t = await getFcmTokenOrNull();
                        if (!t) {
                          const msg =
                            Platform.OS === "ios" &&
                            Device.isDevice === false
                              ? "iOS 模擬器無法取得 APNs token,也無法測真正遠端推播。請改用 iPhone 實機測試。"
                              : Platform.OS === "android"
                                ? "目前取不到 FCM token。請確認你用的是含 Google Play 的模擬器,且原生端已正確配置 FCM。"
                                : "目前取不到推播 token,請確認原生端推播設定是否正確。";
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
                  />
                </>
              ) : null}
            </>
          ) : null}
        </PixelCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  hud: {
    backgroundColor: pixelColors.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: pixelBorderWidth,
    borderBottomColor: pixelColors.ink,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    backgroundColor: pixelColors.gold,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconAlt: {
    width: 36,
    height: 36,
    backgroundColor: pixelColors.purple,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  // 2px 黑線分區,取代雙層 inset box
  divider: {
    height: 2,
    backgroundColor: pixelColors.ink,
    marginVertical: 12,
  },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  // 裝置卡仍保留,因為每張卡有自己的 action buttons,需要視覺邊界
  deviceBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 12,
  },
  monoText: {
    color: pixelColors.white,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  monoRight: {
    flex: 1,
    marginLeft: 8,
    marginTop: 0,
    textAlign: "right",
  },
});

export default Profile;
