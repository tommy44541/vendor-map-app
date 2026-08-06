import { styles } from "./VendorCapsuleTabBar.styles";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelLoading,
  PixelText,
  PixelTextInput,
} from "@/components/pixel";
import { useAuth } from "@/contexts/AuthContext";
import {
  type MerchantLocation,
  merchantApi,
} from "@/services/api/merchant";
import { ApiError } from "@/services/api/util";
import { pixelColors } from "@/theme/pixel";
import { getLocationDisplayLabel } from "@/utils/location/getLocationDisplayLabel";
import { locationMapBridge } from "@/utils/vendor/locationMapBridge";

// ── Tab definitions ──────────────────────────────────────────────
type TabDef = {
  name: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
};

const TABS: TabDef[] = [
  { name: "home",          icon: "home",          label: "首頁" },
  { name: "menu",          icon: "restaurant",    label: "品項" },
  { name: "notifications", icon: "notifications", label: "發布" },
  { name: "location",      icon: "location",      label: "地點" },
  { name: "profile",       icon: "person",        label: "個人" },
];

// ── Component ────────────────────────────────────────────────────
export function VendorCapsuleTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { user, logout } = useAuth();

  const activeRouteName = state.routes[state.index]?.name;
  const isLocationTab = activeRouteName === "location";

  // ── Snap geometry (直接複製客戶端) ───────────────────────────
  // 360 是一般/大螢幕手機的舒適寬度上限;窄螢幕手機（寬度接近或小於 360）
  // 改保留固定兩側邊距，避免膠囊邊緣跟螢幕邊緣相切。
  const CAPSULE_SIDE_MARGIN = 16;
  const CAPSULE_PEEK_WIDTH = Math.min(360, screenWidth - CAPSULE_SIDE_MARGIN * 2);
  const CAPSULE_MID_WIDTH = Math.round(screenWidth * 0.95);
  const CAPSULE_MAX_WIDTH = screenWidth;
  const CAPSULE_SNAP_MIN = 80;
  const CAPSULE_SNAP_MID = Math.round(screenHeight * 0.4);
  const CAPSULE_SNAP_MAX = Math.round(screenHeight * 0.92);
  const TAB_BAR_FIXED_BOTTOM = insets.bottom + 8;
  const midSideGap = Math.max(
    (screenWidth - CAPSULE_MID_WIDTH) / 2,
    insets.bottom + 8,
  );

  const capsuleHeight = useSharedValue(CAPSULE_SNAP_MIN);
  const capsuleStartHeight = useSharedValue(CAPSULE_SNAP_MIN);
  const [capsuleSnapLevel, setCapsuleSnapLevel] = useState<0 | 1 | 2>(0);
  const snapPointsShared = useSharedValue([
    CAPSULE_SNAP_MIN,
    CAPSULE_SNAP_MID,
    CAPSULE_SNAP_MAX,
  ]);

  // 切到其他 tab 時自動收合
  useEffect(() => {
    if (!isLocationTab) {
      capsuleHeight.value = withSpring(CAPSULE_SNAP_MIN, {
        damping: 22,
        stiffness: 200,
      });
      setCapsuleSnapLevel(0);
    }
  }, [isLocationTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 進入地點 tab 時載入位置列表
  useEffect(() => {
    if (isLocationTab) loadLocations();
  }, [isLocationTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 拖曳手勢：只在地點 tab 啟用
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          "worklet";
          capsuleStartHeight.value = capsuleHeight.value;
        })
        .onUpdate((e) => {
          "worklet";
          const next = capsuleStartHeight.value - e.translationY;
          capsuleHeight.value = Math.max(
            CAPSULE_SNAP_MIN,
            Math.min(CAPSULE_SNAP_MAX, next),
          );
        })
        .onEnd((e) => {
          "worklet";
          const velocity = -e.velocityY;
          const projected = capsuleHeight.value + velocity * 0.1;
          const points = snapPointsShared.value;
          let closest = points[0];
          let closestIdx = 0;
          let minDist = Math.abs(projected - points[0]);
          for (let i = 1; i < points.length; i++) {
            const d = Math.abs(projected - points[i]);
            if (d < minDist) {
              minDist = d;
              closest = points[i];
              closestIdx = i;
            }
          }
          capsuleHeight.value = withSpring(closest, {
            damping: 20,
            stiffness: 180,
            velocity,
          });
          runOnJS(setCapsuleSnapLevel)(closestIdx as 0 | 1 | 2);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // 動畫樣式（直接複製客戶端）
  const capsuleAnimatedStyle = useAnimatedStyle(() => ({
    height: capsuleHeight.value,
    width: interpolate(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, CAPSULE_SNAP_MID, CAPSULE_SNAP_MAX],
      [CAPSULE_PEEK_WIDTH, CAPSULE_MID_WIDTH, CAPSULE_MAX_WIDTH],
      Extrapolation.CLAMP,
    ),
    bottom: interpolate(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, CAPSULE_SNAP_MID, CAPSULE_SNAP_MAX],
      [TAB_BAR_FIXED_BOTTOM, midSideGap, 0],
      Extrapolation.CLAMP,
    ),
    // 只讓背景色半透明，子元件保持完全不透明
    backgroundColor: interpolateColor(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, CAPSULE_SNAP_MID, CAPSULE_SNAP_MAX],
      ["rgba(250,244,232,0.82)", "rgba(250,244,232,0.82)", "#FAF4E8"],
    ),
  }));

  // Tab bar 螢幕位置固定（直接複製客戶端補償邏輯）
  const tabBarAnimatedStyle = useAnimatedStyle(() => {
    const capsuleBottom = interpolate(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, CAPSULE_SNAP_MID, CAPSULE_SNAP_MAX],
      [TAB_BAR_FIXED_BOTTOM, midSideGap, 0],
      Extrapolation.CLAMP,
    );
    return { bottom: TAB_BAR_FIXED_BOTTOM - capsuleBottom };
  });

  // ── Navigation ───────────────────────────────────────────────
  const go = (routeName: string, routeKey: string, isActive: boolean) => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isActive && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  // ── Location management state ────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    source: "gps" | "map" | "manual";
  } | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<
    Location.LocationGeocodedLocation[]
  >([]);
  const [geocodeVisible, setGeocodeVisible] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [createIsPrimary, setCreateIsPrimary] = useState(false);
  const [savedLocations, setSavedLocations] = useState<MerchantLocation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIsPrimary, setEditIsPrimary] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ── Location functions ───────────────────────────────────────
  const animateTo = (lat: number, lng: number) => {
    locationMapBridge.flyTo(lat, lng);
  };

  const handleAuthExpired = () => {
    Alert.alert("登錄已過期", "請重新登入後再試", [
      { text: "確定", onPress: async () => { await logout(); } },
    ]);
  };

  const loadLocations = async (preferredId?: string | null) => {
    try {
      setIsListLoading(true);
      const res = await merchantApi.getMerchantLocations();
      const locs: MerchantLocation[] = Array.isArray(res.data) ? res.data : [];
      setSavedLocations(locs);

      if (preferredId) {
        const pref = locs.find((l) => l.ID === preferredId);
        if (pref) {
          setSelectedId(pref.ID);
          animateTo(pref.Latitude, pref.Longitude);
          return;
        }
      }

      const hasSelected = !!selectedId && locs.some((l) => l.ID === selectedId);
      if (!hasSelected) {
        const def = locs.find((l) => l.IsPrimary) ?? locs[0] ?? null;
        if (def) {
          setSelectedId(def.ID);
          animateTo(def.Latitude, def.Longitude);
        } else {
          setSelectedId(null);
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED")
        handleAuthExpired();
      else Alert.alert("錯誤", "取得位置列表失敗，請重試");
    } finally {
      setIsListLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限被拒絕", "需要位置權限才能取得目前位置");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const addr = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const a = addr[0];
      const fullAddr = a
        ? `${a.street || ""} ${a.streetNumber || ""}, ${a.city || ""}, ${a.region || ""} ${a.postalCode || ""}`.trim()
        : "無法取得地址";
      setCurrentLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: fullAddr,
        source: "gps",
      });
      animateTo(loc.coords.latitude, loc.coords.longitude);
    } catch {
      Alert.alert("錯誤", "取得位置失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  const applyGeocode = async (lat: number, lng: number) => {
    try {
      setIsLoading(true);
      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      const a = results?.[0];
      const fullAddr = a
        ? `${a.street || ""} ${a.streetNumber || ""}, ${a.city || ""}, ${a.region || ""} ${a.postalCode || ""}`.trim()
        : addressQuery.trim() || "無法取得地址";
      setCurrentLocation({
        latitude: lat,
        longitude: lng,
        address: fullAddr,
        source: "manual",
      });
      animateTo(lat, lng);
    } catch {
      Alert.alert("錯誤", "無法套用該地址，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  const searchAddress = async () => {
    const q = addressQuery.trim();
    if (!q) {
      Alert.alert("提示", "請輸入地址或地標關鍵字");
      return;
    }
    try {
      setIsGeocoding(true);
      const list = await Location.geocodeAsync(q);
      if (!Array.isArray(list) || list.length === 0) {
        Alert.alert("找不到地址", "請嘗試輸入更完整的地址");
        return;
      }
      if (list.length === 1) {
        await applyGeocode(list[0].latitude, list[0].longitude);
        return;
      }
      setGeocodeResults(list.slice(0, 10));
      setGeocodeVisible(true);
    } catch {
      Alert.alert("錯誤", "地址搜尋失敗，請稍後重試");
    } finally {
      setIsGeocoding(false);
    }
  };

  const saveLocation = async () => {
    if (!currentLocation || !user) {
      Alert.alert("錯誤", "請先取得目前位置");
      return;
    }
    const label = createLabel.trim();
    if (!label) {
      Alert.alert("錯誤", "請輸入位置名稱");
      return;
    }
    try {
      setIsLoading(true);
      const res = await merchantApi.createMerchantLocation({
        label,
        full_address: currentLocation.address,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        is_primary: createIsPrimary,
        is_active: true,
      });
      Alert.alert("成功", "位置已保存到您的商家帳戶");
      setCreateIsPrimary(false);
      setCurrentLocation(null);
      setCreateLabel("");
      await loadLocations(res.data?.ID);
    } catch (error) {
      if (error instanceof ApiError && error.code === "LOCATION_LIMIT_EXCEEDED")
        Alert.alert("錯誤", "您已達到位置數量限制（最多 5 個）");
      else if (error instanceof ApiError && error.code === "TOKEN_EXPIRED")
        handleAuthExpired();
      else Alert.alert("錯誤", "保存位置失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (loc: MerchantLocation) => {
    setEditId(loc.ID);
    setEditLabel(loc.Label || "");
    setEditIsPrimary(!!loc.IsPrimary);
    setEditIsActive(!!loc.IsActive);
    setEditVisible(true);
  };

  const closeEdit = () => {
    if (isSavingEdit) return;
    setEditVisible(false);
    setEditId(null);
    setEditLabel("");
    setEditIsPrimary(false);
    setEditIsActive(true);
  };

  const submitEdit = async () => {
    if (!editId) return;
    const label = editLabel.trim();
    if (!label) {
      Alert.alert("錯誤", "地點名稱不能為空");
      return;
    }
    try {
      setIsSavingEdit(true);
      await merchantApi.updateMerchantLocation(editId, {
        label,
        is_active: editIsActive,
        is_primary: editIsPrimary,
      });
      closeEdit();
      await loadLocations(editId);
    } catch (error) {
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED")
        handleAuthExpired();
      else Alert.alert("錯誤", "更新位置失敗，請重試");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmDelete = (loc: MerchantLocation) => {
    Alert.alert(
      "確認刪除",
      `確定要刪除「${getLocationDisplayLabel(loc.Label)}」嗎？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            try {
              setIsListLoading(true);
              await merchantApi.deleteMerchantLocation(loc.ID);
              setSavedLocations((prev) => prev.filter((l) => l.ID !== loc.ID));
              if (selectedId === loc.ID) setSelectedId(null);
            } catch (error) {
              if (error instanceof ApiError && error.code === "TOKEN_EXPIRED")
                handleAuthExpired();
              else Alert.alert("錯誤", "刪除位置失敗，請重試");
            } finally {
              setIsListLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      <Animated.View style={[styles.floatingCapsule, capsuleAnimatedStyle]}>

          {/* 拖曳把手 + 標題 — 合併成同一塊拖曳區,不用精準按在把手上,
              跟客戶端「整個膠囊都能拖」的手感看齊(但 ScrollView 內容區
              本身不掛手勢,避免跟捲動手勢打架) */}
          {isLocationTab && (
            <GestureDetector gesture={panGesture}>
              <View>
                <View style={styles.capsuleTopHandle}>
                  <View style={styles.capsuleTopHandleBar} />
                </View>
                {capsuleSnapLevel > 0 && (
                  <PixelText variant="title" style={styles.capsuleHeaderTitle}>
                    地點設定
                  </PixelText>
                )}
              </View>
            </GestureDetector>
          )}

          {/* 地點管理內容（地點 tab + 展開時） */}
          {isLocationTab && capsuleSnapLevel > 0 && (
            <View
              style={[styles.capsuleContent, { paddingBottom: 80 + insets.bottom }]}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.contentInner}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* 地址搜尋 */}
                <PixelCard title="地址搜尋" titleTone="blue" padding={12}>
                  <PixelTextInput
                    placeholder="例如：台北市中正區忠孝西路一段"
                    value={addressQuery}
                    onChangeText={setAddressQuery}
                    editable={!isLoading && !isGeocoding}
                    returnKeyType="search"
                    onSubmitEditing={searchAddress}
                  />
                  <View style={{ height: 10 }} />
                  <PixelButton
                    label={isGeocoding ? "..." : "> 搜尋地址"}
                    tone="ink"
                    fullWidth
                    disabled={isLoading || isGeocoding}
                    onPress={searchAddress}
                  />
                  <View style={{ height: 6 }} />
                  <PixelText variant="caption" tone="muted">
                    找不到時請輸入更完整地址（城市/區域/路名）
                  </PixelText>
                </PixelCard>

                {/* GPS / 保存 */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <PixelButton
                      label={isLoading ? "..." : "> 取得目前位置"}
                      tone="blue"
                      fullWidth
                      disabled={isLoading}
                      onPress={getCurrentLocation}
                    />
                  </View>
                  {currentLocation && (
                    <View style={{ flex: 1 }}>
                      <PixelButton
                        label={isLoading ? "..." : "> 保存位置"}
                        tone="gold"
                        fullWidth
                        disabled={isLoading}
                        onPress={saveLocation}
                      />
                    </View>
                  )}
                </View>

                {/* 新增地點表單 */}
                {currentLocation && (
                  <PixelCard title="新增地點" titleTone="gold" padding={12}>
                    <PixelTextInput
                      label="位置名稱"
                      placeholder="例如：附近地標名稱 / 店家名稱"
                      value={createLabel}
                      onChangeText={setCreateLabel}
                      editable={!isLoading}
                      maxLength={30}
                      returnKeyType="done"
                    />
                    <View style={{ height: 10 }} />
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <PixelText variant="bodyLg">設為主要地點</PixelText>
                        <PixelText variant="caption" tone="muted">
                          勾選後成為預設出發地點
                        </PixelText>
                      </View>
                      <Switch
                        value={createIsPrimary}
                        onValueChange={setCreateIsPrimary}
                        disabled={isLoading}
                        trackColor={{
                          false: pixelColors.gray700,
                          true: pixelColors.gold,
                        }}
                        thumbColor={pixelColors.paper}
                      />
                    </View>
                    <View style={{ height: 10 }} />
                    <View style={styles.addressBox}>
                      <PixelText variant="caption" tone="muted">
                        目前地址
                      </PixelText>
                      <View style={{ height: 4 }} />
                      <PixelText variant="body">
                        {currentLocation.address}
                      </PixelText>
                    </View>
                  </PixelCard>
                )}

                {/* 已保存位置 */}
                <View style={styles.savedHeader}>
                  <PixelText variant="bodyLg">已保存位置</PixelText>
                  <PixelButton
                    label={isListLoading ? "..." : ">> 刷新"}
                    tone="paper"
                    size="sm"
                    disabled={isListLoading}
                    onPress={() => loadLocations()}
                  />
                </View>

                {isListLoading && savedLocations.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <PixelLoading label="" size="sm" tone="gold" />
                    <View style={{ height: 6 }} />
                    <PixelText variant="caption" tone="muted">
                      載入中...
                    </PixelText>
                  </View>
                ) : savedLocations.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <PixelText variant="body" tone="muted">
                      暫無已保存位置。先取得目前位置或搜尋地址再保存。
                    </PixelText>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {savedLocations.map((loc) => {
                      const isSelected = loc.ID === selectedId;
                      return (
                        <Pressable
                          key={loc.ID}
                          style={[
                            styles.locItem,
                            isSelected && styles.locItemSelected,
                          ]}
                          onPress={() => {
                            setSelectedId(loc.ID);
                            animateTo(loc.Latitude, loc.Longitude);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={styles.locTitleRow}>
                              <PixelText variant="bodyLg">
                                {getLocationDisplayLabel(loc.Label)}
                              </PixelText>
                              {loc.IsPrimary && (
                                <PixelChip label="主要" tone="purple" active />
                              )}
                              <PixelChip
                                label={loc.IsActive ? "啟用" : "停用"}
                                tone={loc.IsActive ? "green" : "paper"}
                                active
                              />
                            </View>
                            <View style={{ height: 4 }} />
                            <PixelText
                              variant="caption"
                              tone="muted"
                              numberOfLines={2}
                            >
                              {loc.FullAddress}
                            </PixelText>
                          </View>
                          <View style={{ gap: 6 }}>
                            <PixelButton
                              label="編輯"
                              tone="blue"
                              size="sm"
                              onPress={() => openEdit(loc)}
                            />
                            <PixelButton
                              label="x"
                              tone="red"
                              size="sm"
                              display
                              onPress={() => confirmDelete(loc)}
                            />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Tab bar — position absolute，螢幕 Y 固定不動 */}
          <Animated.View style={[styles.capsuleTabBar, tabBarAnimatedStyle]}>
            {TABS.map((tab) => {
              const route = state.routes.find((r) => r.name === tab.name);
              if (!route) return null;
              const isActive = state.index === state.routes.indexOf(route);

              return (
                <Pressable
                  key={tab.name}
                  style={styles.tabItem}
                  onPress={() => go(route.name, route.key, isActive)}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: isActive }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={20}
                    color={isActive ? pixelColors.gold : pixelColors.gray300}
                  />
                  <PixelText
                    variant="caption"
                    style={{
                      color: isActive ? pixelColors.gold : pixelColors.gray300,
                      marginTop: 2,
                    }}
                  >
                    {tab.label}
                  </PixelText>
                </Pressable>
              );
            })}
          </Animated.View>

        </Animated.View>

      {/* 候選地址 Modal */}
      <Modal
        visible={geocodeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGeocodeVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setGeocodeVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <PixelCard
              title="選擇候選地點"
              titleTone="blue"
              padding={16}
              style={styles.modalCard}
            >
              <PixelText variant="body">選擇一個候選位置</PixelText>
              <View style={{ height: 4 }} />
              <PixelText variant="caption" tone="muted">
                共 {geocodeResults.length} 筆（最多顯示 10 筆）
              </PixelText>
              <View style={{ height: 12 }} />
              <View style={{ gap: 8 }}>
                {geocodeResults.map((r, idx) => (
                  <Pressable
                    key={`${r.latitude}-${r.longitude}-${idx}`}
                    style={styles.candidateRow}
                    onPress={async () => {
                      setGeocodeVisible(false);
                      await applyGeocode(r.latitude, r.longitude);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <PixelText variant="bodyLg">候選 {idx + 1}</PixelText>
                      <PixelText variant="caption" tone="muted">
                        lat {r.latitude.toFixed(6)} / lng{" "}
                        {r.longitude.toFixed(6)}
                      </PixelText>
                    </View>
                    <PixelText variant="title" tone="gold" display>
                      {">"}
                    </PixelText>
                  </Pressable>
                ))}
              </View>
              <View style={{ height: 12 }} />
              <PixelButton
                label="取消"
                tone="paper"
                fullWidth
                onPress={() => setGeocodeVisible(false)}
              />
            </PixelCard>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 編輯地點 Modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View style={styles.editWrap}>
          <PixelCard
            title="編輯地點"
            titleTone="blue"
            padding={16}
            style={styles.editCard}
          >
            <PixelTextInput
              label="地點名稱"
              placeholder="請輸入位置名稱"
              value={editLabel}
              onChangeText={setEditLabel}
              editable={!isSavingEdit}
            />
            <View style={{ height: 12 }} />
            <View style={styles.switchRow}>
              <PixelText variant="bodyLg">設為主要地點</PixelText>
              <Switch
                value={editIsPrimary}
                onValueChange={setEditIsPrimary}
                disabled={isSavingEdit}
                trackColor={{
                  false: pixelColors.gray700,
                  true: pixelColors.gold,
                }}
                thumbColor={pixelColors.paper}
              />
            </View>
            <View style={{ height: 8 }} />
            <View style={styles.switchRow}>
              <PixelText variant="bodyLg">是否啟用</PixelText>
              <Switch
                value={editIsActive}
                onValueChange={setEditIsActive}
                disabled={isSavingEdit}
                trackColor={{
                  false: pixelColors.gray700,
                  true: pixelColors.green,
                }}
                thumbColor={pixelColors.paper}
              />
            </View>
            <View style={{ height: 16 }} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <PixelButton
                  label="取消"
                  tone="paper"
                  fullWidth
                  disabled={isSavingEdit}
                  onPress={closeEdit}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PixelButton
                  label={isSavingEdit ? "..." : "> 保存"}
                  tone="blue"
                  fullWidth
                  disabled={isSavingEdit}
                  onPress={submitEdit}
                />
              </View>
            </View>
          </PixelCard>
        </View>
      </Modal>
    </>
  );
}
