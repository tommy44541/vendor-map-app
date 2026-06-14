import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelSegmentedControl,
  PixelText,
  PixelTextInput,
} from "@/components/pixel";
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { getLocationDisplayLabel } from "@/utils/location/getLocationDisplayLabel";
import {
  getRecentPublishedResults,
  saveRecentPublishedResult,
} from "@/utils/vendor/recentPublish";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../contexts/AuthContext";
import { merchantApi, MerchantLocation } from "../../../services/api/merchant";
import {
  notificationApi,
  PublishLocationNotificationData,
} from "../../../services/api/notification";
import { ApiError } from "../../../services/api/util";

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
  const [isRefreshingLast, setIsRefreshingLast] = useState(false);

  const [tempLocationName, setTempLocationName] = useState("");
  const [tempFullAddress, setTempFullAddress] = useState("");
  const [tempLatitude, setTempLatitude] = useState("");
  const [tempLongitude, setTempLongitude] = useState("");
  const [isGettingTempLocation, setIsGettingTempLocation] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
    return () => {
      isMountedRef.current = false;
    };
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
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        handleAuthExpired();
      } else {
        Alert.alert("錯誤", "獲取位置列表失敗,請重試");
      }
    } finally {
      setIsLoadingLocations(false);
    }
  };

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const cached = await getRecentPublishedResults();
      setLastPublished(cached[0] ?? null);
    })();
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
      Alert.alert("錯誤", "獲取當前位置失敗,請重試");
    } finally {
      setIsGettingTempLocation(false);
    }
  };

  const publish = async () => {
    const msg = hintMessage.trim();
    if (!msg) {
      Alert.alert("提示", "請輸入提示訊息 (hint message)");
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
        Alert.alert("提示", "請輸入地點名稱 (LocationName)");
        return;
      }
      if (!addr) {
        Alert.alert("提示", "請輸入完整地址 (FullAddress)");
        return;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        Alert.alert("提示", "請輸入正確的經緯度 (數字)");
        return;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        Alert.alert("提示", "經緯度範圍不正確 (lat -90~90, lng -180~180)");
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

      setLastPublished(res.data);
      await saveRecentPublishedResult(res.data);
      autoRefreshPublishedStats(res.data).catch((e) => {
        console.warn("auto refresh published stats failed:", e);
      });
      setHintMessage("");
      if (mode === "temp") {
        setTempLocationName("");
        setTempFullAddress("");
        setTempLatitude("");
        setTempLongitude("");
      }
      Alert.alert("成功", "已發布位置通知");
    } catch (error: any) {
      console.error("發布通知失敗:", error);
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        handleAuthExpired();
      } else {
        Alert.alert("錯誤", "發布通知失敗,請重試");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const refreshLastPublished = async () => {
    if (!lastPublished?.ID) return;
    try {
      setIsRefreshingLast(true);
      const found = await findPublishedById(lastPublished.ID);
      if (found) {
        setLastPublished(found);
        await saveRecentPublishedResult(found);
      }
    } catch (e) {
      console.warn("refresh notification history failed:", e);
    } finally {
      setIsRefreshingLast(false);
    }
  };

  const findPublishedById = async (
    publishId: string
  ): Promise<PublishLocationNotificationData | null> => {
    const res = await notificationApi.getMerchantNotificationHistory({
      limit: 20,
      offset: 0,
    });
    return Array.isArray(res.data)
      ? res.data.find((n) => n.ID === publishId) || null
      : null;
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  const autoRefreshPublishedStats = async (
    initial: PublishLocationNotificationData
  ) => {
    let latest = initial;
    const retryDelays = [1500, 3000, 5000];

    for (const delayMs of retryDelays) {
      await sleep(delayMs);
      if (!isMountedRef.current) return;

      try {
        const found = await findPublishedById(initial.ID);
        if (!found) continue;

        const changed =
          found.TotalSent !== latest.TotalSent ||
          found.TotalFailed !== latest.TotalFailed;

        if (changed) {
          latest = found;
          setLastPublished(found);
          await saveRecentPublishedResult(found);
        }
      } catch (error) {
        console.warn("auto refresh retry failed:", error);
      }
    }
  };

  return (
    <View style={styles.root}>
      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <PixelText variant="caption" tone="red" display>
            BROADCAST
          </PixelText>
          <PixelText variant="display">發布位置通知</PixelText>
          <View style={{ height: 4 }} />
          <PixelText variant="caption" tone="muted">
            選已保存位置或輸入臨時地點,寫好訊息送出
          </PixelText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 120,
            gap: 14,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mode segmented */}
          <PixelSegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: "saved", label: "已保存" },
              { value: "temp", label: "臨時" },
            ]}
          />

          {/* 位置 PixelCard */}
          <PixelCard
            title="LOCATION"
            titleTone="gold"
            titleDisplay
            padding={14}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name="location"
                  size={18}
                  color={pixelColors.ink}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PixelText variant="bodyLg">位置</PixelText>
                <PixelText variant="caption" tone="muted">
                  {mode === "saved"
                    ? "選一個已保存位置"
                    : "臨時模式不需要選擇"}
                </PixelText>
              </View>
              {mode === "saved" ? (
                <PixelButton
                  label={isLoadingLocations ? "..." : ">> 刷新"}
                  tone="paper"
                  size="sm"
                  disabled={isLoadingLocations || isPublishing}
                  onPress={loadLocations}
                />
              ) : null}
            </View>

            {mode !== "saved" ? (
              <View style={styles.noticeBox}>
                <PixelText variant="body">
                  你正在使用「臨時地點」模式,發布時會以下方填寫的資訊為準。
                </PixelText>
              </View>
            ) : isLoadingLocations && locations.length === 0 ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={pixelColors.gold} />
                <View style={{ height: 6 }} />
                <PixelText variant="caption" tone="muted">
                  載入中...
                </PixelText>
              </View>
            ) : locations.length === 0 ? (
              <View style={styles.noticeBox}>
                <PixelText variant="body">
                  目前沒有可用位置。請先到「地點」頁新增並保存位置。
                </PixelText>
              </View>
            ) : (
              <View style={{ marginTop: 12, gap: 8 }}>
                {locations.map((item) => {
                  const isSelected = item.ID === selectedLocationId;
                  const displayLabel = getLocationDisplayLabel(item.Label);
                  return (
                    <Pressable
                      key={item.ID}
                      onPress={() => setSelectedLocationId(item.ID)}
                      style={[
                        styles.locationItem,
                        isSelected ? styles.locationItemSelected : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.locationIcon,
                          {
                            backgroundColor: isSelected
                              ? pixelColors.gold
                              : pixelColors.surfaceAlt,
                          },
                        ]}
                      >
                        <Ionicons
                          name="location"
                          size={16}
                          color={
                            isSelected ? pixelColors.ink : pixelColors.gray300
                          }
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.locationTitleRow}>
                          <PixelText variant="bodyLg">{displayLabel}</PixelText>
                          {item.IsPrimary ? (
                            <PixelChip label="主要" tone="purple" active />
                          ) : null}
                          <PixelChip
                            label={item.IsActive ? "啟用" : "停用"}
                            tone={item.IsActive ? "green" : "paper"}
                            active
                          />
                        </View>
                        <View style={{ height: 4 }} />
                        <PixelText
                          variant="caption"
                          tone="muted"
                          numberOfLines={2}
                        >
                          {item.FullAddress}
                        </PixelText>
                      </View>
                      <PixelText
                        variant="title"
                        tone={isSelected ? "gold" : "muted"}
                        display
                      >
                        {isSelected ? "*" : ">"}
                      </PixelText>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {mode === "saved" && selectedLocation ? (
              <View style={styles.selectedSummary}>
                <PixelText variant="caption" tone="gold" display>
                  SELECTED
                </PixelText>
                <View style={{ height: 2 }} />
                <PixelText variant="bodyLg">
                  {getLocationDisplayLabel(selectedLocation.Label)}
                </PixelText>
                {selectedLocation.FullAddress ? (
                  <>
                    <View style={{ height: 4 }} />
                    <PixelText
                      variant="caption"
                      tone="muted"
                      numberOfLines={2}
                    >
                      {selectedLocation.FullAddress}
                    </PixelText>
                  </>
                ) : null}
              </View>
            ) : null}
          </PixelCard>

          {/* 臨時地點 */}
          {mode === "temp" ? (
            <PixelCard
              title="TEMP  LOCATION"
              titleTone="purple"
              titleDisplay
              padding={14}
            >
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.headerIcon,
                    { backgroundColor: pixelColors.purple },
                  ]}
                >
                  <Ionicons
                    name="navigate"
                    size={18}
                    color={pixelColors.white}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PixelText variant="bodyLg">臨時地點資訊</PixelText>
                  <PixelText variant="caption" tone="muted">
                    可使用目前位置自動填入經緯度與地址
                  </PixelText>
                </View>
                <PixelButton
                  label={
                    isGettingTempLocation ? "..." : "> 使用當前位置"
                  }
                  tone="blue"
                  size="sm"
                  disabled={isGettingTempLocation || isPublishing}
                  onPress={fillTempWithCurrentLocation}
                />
              </View>

              <View style={{ height: 12 }} />
              <View style={{ gap: 10 }}>
                <PixelTextInput
                  label="地點名稱"
                  placeholder="例如:快閃攤位 / 活動現場"
                  value={tempLocationName}
                  onChangeText={setTempLocationName}
                  editable={!isPublishing}
                />
                <PixelTextInput
                  label="完整地址"
                  placeholder="例如:台北市中正區..."
                  value={tempFullAddress}
                  onChangeText={setTempFullAddress}
                  editable={!isPublishing}
                  multiline
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <PixelTextInput
                      label="緯度"
                      placeholder="25.0478"
                      value={tempLatitude}
                      onChangeText={setTempLatitude}
                      editable={!isPublishing}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelTextInput
                      label="經度"
                      placeholder="121.5170"
                      value={tempLongitude}
                      onChangeText={setTempLongitude}
                      editable={!isPublishing}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </PixelCard>
          ) : null}

          {/* 提示訊息 */}
          <PixelCard
            title="MESSAGE"
            titleTone="red"
            titleDisplay
            padding={14}
          >
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: pixelColors.red },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={18}
                  color={pixelColors.white}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PixelText variant="bodyLg">提示訊息</PixelText>
                <PixelText variant="caption" tone="muted">
                  建議包含優惠 / 營業時間 / 現場提醒
                </PixelText>
              </View>
              <PixelChip
                label={`${hintMessage.trim().length} 字`}
                tone="paper"
                active
              />
            </View>

            <View style={{ height: 12 }} />
            <PixelTextInput
              placeholder="例如:今天有特價活動,歡迎來店!"
              value={hintMessage}
              onChangeText={setHintMessage}
              editable={!isPublishing}
              multiline
              style={{ minHeight: 88 }}
            />

            <View style={{ height: 14 }} />
            <PixelButton
              label={
                isPublishing
                  ? "..."
                  : mode === "saved"
                    ? ">> 發布通知 (已保存)"
                    : ">> 發布通知 (臨時)"
              }
              tone="red"
              size="lg"
              fullWidth
              disabled={isPublishing}
              onPress={publish}
            />
          </PixelCard>

          {/* 最近一次發布結果 */}
          {lastPublished ? (
            <PixelCard
              title="LAST  RESULT"
              titleTone="green"
              titleDisplay
              padding={14}
            >
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.headerIcon,
                    { backgroundColor: pixelColors.green },
                  ]}
                >
                  <Ionicons
                    name="stats-chart"
                    size={18}
                    color={pixelColors.ink}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PixelText variant="bodyLg">最近一次發布結果</PixelText>
                </View>
                <PixelButton
                  label={isRefreshingLast ? "..." : ">> 刷新統計"}
                  tone="paper"
                  size="sm"
                  disabled={isRefreshingLast}
                  onPress={refreshLastPublished}
                />
              </View>

              <View style={{ height: 12 }} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatBox
                  label="發送成功"
                  value={String(lastPublished.TotalSent)}
                  tone="green"
                />
                <StatBox
                  label="發送失敗"
                  value={String(lastPublished.TotalFailed)}
                  tone={lastPublished.TotalFailed > 0 ? "red" : "paper"}
                />
              </View>

              <View style={{ height: 10 }} />
              <View style={styles.timestampRow}>
                <Ionicons name="time" size={14} color={pixelColors.gray300} />
                <PixelText variant="caption" tone="muted">
                  PublishedAt {lastPublished.PublishedAt}
                </PixelText>
              </View>
            </PixelCard>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "paper";
}) {
  const accent =
    tone === "green"
      ? pixelColors.green
      : tone === "red"
        ? pixelColors.red
        : pixelColors.paper;
  const valueTone =
    tone === "green" ? "green" : tone === "red" ? "red" : "default";
  return (
    <View style={[styles.statBox, { borderTopColor: accent }]}>
      <PixelText variant="caption" tone="muted">
        {label}
      </PixelText>
      <View style={{ height: 4 }} />
      <PixelText variant="display" tone={valueTone}>
        {value}
      </PixelText>
    </View>
  );
}

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
  noticeBox: {
    marginTop: 12,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 12,
  },
  centerBox: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surface,
    padding: 10,
  },
  locationItemSelected: {
    backgroundColor: pixelColors.surfaceAlt,
    borderColor: pixelColors.gold,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  selectedSummary: {
    marginTop: 12,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.gold,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 10,
  },
  statBox: {
    flex: 1,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    borderTopWidth: 6,
    backgroundColor: pixelColors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});

export default Notifications;
