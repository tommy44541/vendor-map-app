import { subscriptionsApi } from "@/services/api/subscriptions";
import {
  discoveryApi,
  type DiscoveryCategory,
  type PublicMerchantSearchItem,
} from "@/services/api/discovery";
import { ApiError } from "@/services/api/util";
import { discoveryLabel } from "@/utils/discovery/labels";
import { getFcmTokenOrNull, getStableDeviceId } from "@/utils/push";
import { parseMerchantIdFromQrData } from "@/utils/qr/subscriptionQr";
import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelLoading,
  PixelText,
  PixelTextInput,
} from "@/components/pixel";
import {
  pixelBorderWidth,
  pixelColors,
  pixelRadius,
} from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import Constants from "expo-constants";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getMerchantDisplayName } from "@/utils/merchant/getMerchantDisplayName";
import { useAuth } from "../../../contexts/AuthContext";
import { UnifiedMap, type UnifiedMapMarker } from "@/components/maps/UnifiedMap";
import { pixelMapStyle } from "@/theme/mapStylePixel";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// Phase 3 v4:tab 直向 icon+label 排列,peek 高度重算。
// item = icon 20 + margin 2 + label ~15 + paddingV 6*2 = ~49
// footer = item 49 + paddingT/B 8*2 = 65,sheet border 2*2 = 69
// 0 = 純 tab(70px)
// 1 = 中段(40%)
// 2 = 滿版(95%),backdrop 加深
const SNAP_POINTS = [70, "40%", "95%"];
const FALLBACK_REGION = {
  // 台中市中心 fallback,商家 test 位置剛好在這附近
  latitude: 24.1577,
  longitude: 120.658,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type SubscriptionVendor = {
  id: string;
  name: string;
  cuisine: string;
  meta: string;
  statusLabel: string;
};

const getDiscoveryLabel = (
  value?: { slug?: string | null; name?: string | null } | null
) => discoveryLabel(value, "精選商家");

const formatDistance = (meters?: number | null) => {
  if (typeof meters !== "number") return "距離未提供";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const formatNotificationTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return "剛剛";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分鐘前`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小時前`;
    return d.toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

// 內嵌 tab — sheet 內切換 section,不走 router navigation,所以切 tab sheet 不收
type ConsumerTab = "explore" | "favorites" | "profile" | "notifications";

const TAB_PILL_ITEMS: {
  id: ConsumerTab;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { id: "explore", icon: "compass", label: "探索" },
  { id: "favorites", icon: "heart", label: "收藏" },
  { id: "notifications", icon: "notifications", label: "通知" },
  { id: "profile", icon: "person", label: "個人" },
];

export default function ConsumerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profilePushStatus, setProfilePushStatus] = useState<
    "unknown" | "ready" | "missing"
  >("unknown");
  const [profilePushLoading, setProfilePushLoading] = useState(false);
  const [receivedNotifications, setReceivedNotifications] = useState<
    { id: string; title?: string; body?: string; receivedAt: string }[]
  >([]);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ConsumerTab>("explore");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
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
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryCategories, setDiscoveryCategories] = useState<
    DiscoveryCategory[]
  >([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(
    null
  );
  const [publicMerchants, setPublicMerchants] = useState<
    PublicMerchantSearchItem[]
  >([]);

  // 關鍵字搜尋(raw input)與 debounce 後實際觸發查詢的字串
  const [keyword, setKeyword] = useState("");
  const [keywordDebounced, setKeywordDebounced] = useState("");

  // 使用者目前 GPS 位置,有的話會讓 backend 回 distance_meters + 距離排序
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "asking" | "granted" | "denied" | "error"
  >("idle");

  // keyword debounce 400ms,避免每打一個字就打 API
  useEffect(() => {
    const id = setTimeout(() => setKeywordDebounced(keyword.trim()), 400);
    return () => clearTimeout(id);
  }, [keyword]);

  // 進入頁面時要一次位置權限,拿到位置後 loadPublicMerchants 會自動 re-run
  // (lat/lng 在 deps 內,location 狀態變更會觸發新 request id)
  const requestUserLocation = useCallback(async () => {
    try {
      setLocationStatus("asking");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLocationStatus("granted");
    } catch (e) {
      console.warn("get location failed:", e);
      setLocationStatus("error");
    }
  }, []);

  useEffect(() => {
    void requestUserLocation();
  }, [requestUserLocation]);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

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
        ]
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

  const checkProfilePushStatus = useCallback(async () => {
    try {
      const [permission, token] = await Promise.all([
        (await import("@/utils/push")).getPushPermissionStatus(),
        getFcmTokenOrNull(),
      ]);
      setProfilePushStatus(
        permission === "granted" && !!token ? "ready" : "missing"
      );
    } catch {
      setProfilePushStatus("missing");
    }
  }, []);

  useEffect(() => {
    if (activeTab === "profile") void checkProfilePushStatus();
  }, [activeTab, checkProfilePushStatus]);

  // 監聽 in-app 收到的推播,累積成通知歷史(最多 20 筆)
  useEffect(() => {
    let sub: any = null;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        sub = Notifications.addNotificationReceivedListener((n) => {
          const content = n?.request?.content;
          setReceivedNotifications((prev) => [
            {
              id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
              title: content?.title ?? undefined,
              body: content?.body ?? undefined,
              receivedAt: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 20));
        });
      } catch (e) {
        console.warn("expo-notifications not available:", e);
      }
    })();
    return () => {
      try {
        sub?.remove?.();
      } catch {}
    };
  }, []);

  const setupProfilePush = useCallback(async () => {
    try {
      setProfilePushLoading(true);
      const mod = await import("@/utils/push");
      const res = await mod.onUserAuthenticated({
        requestPermissionIfNeeded: true,
      });
      await checkProfilePushStatus();
      Alert.alert(
        res.ok ? "完成" : "未完成",
        res.ok ? "推播已設定完成" : `未完成:${res.step}`
      );
    } catch (e: any) {
      Alert.alert("錯誤", e?.message || "推播設定失敗");
    } finally {
      setProfilePushLoading(false);
    }
  }, [checkProfilePushStatus]);

  const handleProfileLogout = useCallback(() => {
    Alert.alert("登出", "確定要登出嗎?", [
      { text: "取消", style: "cancel" },
      {
        text: "登出",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/");
          } catch (e: any) {
            Alert.alert("錯誤", e?.message || "登出失敗");
          }
        },
      },
    ]);
  }, [logout, router]);

  const unsubscribeMerchant = useCallback(
    async (merchantId: string, name: string) => {
      Alert.alert("取消訂閱", `確定要取消訂閱「${name}」嗎?`, [
        { text: "取消", style: "cancel" },
        {
          text: "取消訂閱",
          style: "destructive",
          onPress: async () => {
            try {
              setSubLoading(true);
              await subscriptionsApi.unsubscribeMerchant(merchantId);
              await loadSubscribedVendors();
            } catch (e: any) {
              if (e instanceof ApiError && e.code === "TOKEN_EXPIRED") return;
              Alert.alert("錯誤", e?.message || "取消訂閱失敗");
            } finally {
              setSubLoading(false);
            }
          },
        },
      ]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const loadSubscribedVendors = useCallback(async () => {
    try {
      setSubscriptionsLoading(true);
      const res = await subscriptionsApi.getSubscriptions();
      const list = Array.isArray(res.data) ? res.data : [];
      const activeList = list.filter((item) => item?.is_active);

      setSubscribedVendors(
        activeList.map((item) => ({
          id: String(item.merchant_id || ""),
          name: getMerchantDisplayName(item) || "已訂閱商家",
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
  }, []);

  const loadPublicMerchantsRequestId = useRef(0);

  const loadPublicMerchants = useCallback(async () => {
    const requestId = ++loadPublicMerchantsRequestId.current;
    const isLatest = () => requestId === loadPublicMerchantsRequestId.current;
    try {
      setDiscoveryLoading(true);
      setDiscoveryError(null);

      const [categoriesRes, merchantsRes] = await Promise.all([
        discoveryApi.listCategories(),
        discoveryApi.searchPublicMerchants({
          ...(selectedCategorySlug
            ? { category_slug: selectedCategorySlug }
            : {}),
          ...(keywordDebounced ? { keyword: keywordDebounced } : {}),
          ...(userLocation
            ? {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }
            : {}),
          page: 1,
          page_size: 6,
        }),
      ]);

      if (!isLatest()) return;

      setDiscoveryCategories(
        Array.isArray(categoriesRes.data?.categories)
          ? categoriesRes.data.categories
          : []
      );
      setPublicMerchants(
        Array.isArray(merchantsRes.data?.merchants)
          ? merchantsRes.data.merchants
          : []
      );
    } catch (e: any) {
      if (!isLatest()) return;
      console.warn("load public merchants failed:", e);
      setDiscoveryError(e?.message || "目前無法載入公開探索商家");
      setPublicMerchants([]);
    } finally {
      if (isLatest()) {
        setDiscoveryLoading(false);
      }
    }
  }, [selectedCategorySlug, keywordDebounced, userLocation]);

  useEffect(() => {
    void loadSubscribedVendors();
  }, [loadSubscribedVendors]);

  useFocusEffect(
    useCallback(() => {
      void loadSubscribedVendors();
      void loadPublicMerchants();
      return () => {
        loadPublicMerchantsRequestId.current++;
      };
    }, [loadPublicMerchants, loadSubscribedVendors])
  );

  // Map state: region 跟著 userLocation 自動更新,沒位置時用 fallback。
  const mapRegion = useMemo(
    () =>
      userLocation
        ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }
        : FALLBACK_REGION,
    [userLocation]
  );

  // publicMerchants → map markers,過濾沒座標的
  const mapMarkers: UnifiedMapMarker[] = useMemo(
    () =>
      publicMerchants
        .filter((m) => m.primary_location?.latitude && m.primary_location?.longitude)
        .map((m) => ({
          id: m.merchant_id,
          latitude: m.primary_location!.latitude,
          longitude: m.primary_location!.longitude,
          title: m.store_name,
          description: m.store_description ?? undefined,
          pinColor: pixelColors.gold,
        })),
    [publicMerchants]
  );

  // 只在 dark mode 套像素 muted 配色;light mode 走系統預設(Google 彩色 / Apple 淡色)
  const colorScheme = useColorScheme();
  const mapCustomStyle = colorScheme === "dark" ? pixelMapStyle : undefined;

  // === 浮島膠囊拖曳 + 三段 snap ===
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const CAPSULE_PEEK_WIDTH = 360;
  const CAPSULE_MID_WIDTH = Math.round(screenWidth * 0.95);
  const CAPSULE_MAX_WIDTH = screenWidth;
  const CAPSULE_SNAP_MIN = 80;
  const CAPSULE_SNAP_MID = Math.round(screenHeight * 0.4);
  const CAPSULE_SNAP_MAX = Math.round(screenHeight * 0.92);
  const capsuleHeight = useSharedValue(CAPSULE_SNAP_MIN);
  const capsuleStartHeight = useSharedValue(CAPSULE_SNAP_MIN);
  // 0 = peek, 1 = mid, 2 = max。用來決定 render 多少內容
  const [capsuleSnapLevel, setCapsuleSnapLevel] = useState<0 | 1 | 2>(0);

  // worklet helper:找最接近當前值的 snap point
  const snapPointsShared = useSharedValue([
    CAPSULE_SNAP_MIN,
    CAPSULE_SNAP_MID,
    CAPSULE_SNAP_MAX,
  ]);

  const capsulePanGesture = Gesture.Pan()
    .onBegin(() => {
      "worklet";
      capsuleStartHeight.value = capsuleHeight.value;
    })
    .onUpdate((e) => {
      "worklet";
      const next = capsuleStartHeight.value - e.translationY;
      capsuleHeight.value = Math.max(
        CAPSULE_SNAP_MIN,
        Math.min(CAPSULE_SNAP_MAX, next)
      );
    })
    .onEnd((e) => {
      "worklet";
      // 依放手時的速度決定往哪 snap:上飛去更大的、下飛去更小的、慢速找最近
      const velocity = -e.velocityY; // 上為正
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
        velocity: velocity,
      });
      runOnJS(setCapsuleSnapLevel)(closestIdx as 0 | 1 | 2);
    });

  // MID 時左右各的 gap(寬度差的一半)— bar 底部貼齊這個 gap,四邊等距
  const midSideGap = (screenWidth - CAPSULE_MID_WIDTH) / 2;
  // Tab bar 螢幕底部固定 Y — 一次調這裡,capsule MIN 位置 + tab bar 補償都同步
  const TAB_BAR_FIXED_BOTTOM = 8;

  const capsuleAnimatedStyle = useAnimatedStyle(() => ({
    height: capsuleHeight.value,
    width: interpolate(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, CAPSULE_SNAP_MID, CAPSULE_SNAP_MAX],
      [CAPSULE_PEEK_WIDTH, CAPSULE_MID_WIDTH, CAPSULE_MAX_WIDTH],
      Extrapolation.CLAMP
    ),
    bottom: interpolate(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, CAPSULE_SNAP_MID, CAPSULE_SNAP_MAX],
      [TAB_BAR_FIXED_BOTTOM, midSideGap, 0],
      Extrapolation.CLAMP
    ),
  }));

  // 頂部 drag handle 只在展開時才顯示,peek 時淡出讓 tab bar 佔滿
  const topHandleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, (CAPSULE_SNAP_MIN + CAPSULE_SNAP_MID) / 2],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  // Tab bar 螢幕位置固定在 TAB_BAR_FIXED_BOTTOM,補償 capsule 下移
  const tabBarAnimatedStyle = useAnimatedStyle(() => {
    const capsuleBottom = interpolate(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, CAPSULE_SNAP_MID, CAPSULE_SNAP_MAX],
      [TAB_BAR_FIXED_BOTTOM, midSideGap, 0],
      Extrapolation.CLAMP
    );
    return {
      bottom: TAB_BAR_FIXED_BOTTOM - capsuleBottom,
    };
  });

  // 滿版時(index 2)才出 backdrop,index 1 完全透明
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={2}
        disappearsOnIndex={1}
        opacity={0.45}
        pressBehavior="collapse"
      />
    ),
    []
  );

  const sheetAnimatedIndex = useSharedValue(1);

  // outer 只做左右內縮的漸變。overflow/radius 掛在 containerStyle(gorhom 真正的
  // outer wrapper) 才會 clip 到 bg + footer + handle 全部。
  const sheetOuterStyle = useAnimatedStyle(() => ({
    marginHorizontal: interpolate(
      sheetAnimatedIndex.value,
      [0, 1, 2],
      [24, 16, 4],
      Extrapolation.CLAMP
    ),
  }));

  // sheet bg static
  const sheetBgStyle = {
    backgroundColor: pixelColors.surface,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: 20,
  } as const;

  // Footer 透明疊在 sheet bg 上,sheet bg 顯露的 surface 色就是 tab bar 底色。
  // Peek 時 sheet 高度 = footer 高度,整體看起來就是「一顆膠囊裡放 4 個 tab」
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View style={styles.tabPillFooter}>
          {TAB_PILL_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.tabPillItem,
                  isActive ? styles.tabPillItemActive : null,
                ]}
                onPress={() => setActiveTab(item.id)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive ? pixelColors.ink : pixelColors.gray300}
                />
                <PixelText
                  variant="caption"
                  style={{
                    color: isActive ? pixelColors.ink : pixelColors.gray300,
                    marginTop: 2,
                  }}
                >
                  {item.label}
                </PixelText>
              </Pressable>
            );
          })}
        </View>
      </BottomSheetFooter>
    ),
    [activeTab]
  );

  // peek 時 handle 完全收起(高度 0、透明),sheet 高度才能精準 = footer
  // 拖出 peek 後才漸漸出現 handle bar 作為展開狀態的拖拉提示
  const handleWrapStyle = useAnimatedStyle(() => ({
    height: interpolate(
      sheetAnimatedIndex.value,
      [0, 1],
      [0, 22],
      Extrapolation.CLAMP
    ),
    opacity: interpolate(
      sheetAnimatedIndex.value,
      [0, 0.5],
      [0, 1],
      Extrapolation.CLAMP
    ),
    overflow: "hidden",
  }));

  const handlePillStyle = useAnimatedStyle(() => ({
    width: interpolate(
      sheetAnimatedIndex.value,
      [1, 2],
      [56, 36],
      Extrapolation.CLAMP
    ),
    height: interpolate(
      sheetAnimatedIndex.value,
      [1, 2],
      [5, 3],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <View style={styles.root}>
      {/* 全螢幕地圖底層 */}
      <UnifiedMap
        region={mapRegion}
        style={StyleSheet.absoluteFill}
        markers={mapMarkers}
        customMapStyle={mapCustomStyle}
        showsUserLocation
      />

      {/* 重寫中:整個膠囊是 drag surface,content 不 scroll,任何位置拖曳都控 sheet 高度 */}
      <GestureDetector gesture={capsulePanGesture}>
        <Animated.View
          style={[styles.floatingCapsule, capsuleAnimatedStyle]}
        >
          {/* 頂部 drag handle — peek 時淡出讓給 tab bar,展開時顯示 */}
          <Animated.View
            style={[styles.capsuleTopHandle, topHandleAnimatedStyle]}
            pointerEvents="none"
          >
            <View style={styles.capsuleTopHandleBar} />
          </Animated.View>

          {/* content 區 — 純 View 不 scroll,單純 placeholder 顯示 */}
          <View style={styles.capsuleContent}>
            {/* 共用 header:標題 + 齒輪(peek 時隱藏)*/}
            {capsuleSnapLevel > 0 && (
              <View style={styles.capsuleSectionHeader}>
                <PixelText variant="display">
                  {TAB_PILL_ITEMS.find((t) => t.id === activeTab)?.label ?? ""}
                </PixelText>
                <Pressable
                  onPress={() => setSettingsMenuOpen(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="設定"
                >
                  <Ionicons
                    name="settings-outline"
                    size={26}
                    color={pixelColors.gray300}
                  />
                </Pressable>
              </View>
            )}

            {activeTab === "explore" && capsuleSnapLevel > 0 && (
              <View style={{ gap: 8, flex: 1 }}>
                {publicMerchants
                  .slice(0, capsuleSnapLevel === 1 ? 4 : 10)
                  .map((merchant) => {
                    const cat = getDiscoveryLabel(
                      merchant.discovery_subcategory ||
                        merchant.discovery_category
                    );
                    return (
                      <Pressable
                        key={merchant.merchant_id}
                        onPress={() =>
                          router.push({
                            pathname: "/consumer/vendor/[id]",
                            params: {
                              id: merchant.merchant_id,
                              name: merchant.store_name,
                              cuisine: cat,
                              description: merchant.store_description,
                              address:
                                merchant.primary_location?.full_address || "",
                              distance: formatDistance(
                                merchant.distance_meters
                              ),
                            },
                          })
                        }
                        style={styles.exploreMerchantRow}
                      >
                        <View style={{ flex: 1 }}>
                          <PixelText variant="bodyLg" numberOfLines={1}>
                            {merchant.store_name || "未命名商家"}
                          </PixelText>
                          <PixelText
                            variant="caption"
                            tone="muted"
                            numberOfLines={1}
                          >
                            {cat}
                          </PixelText>
                        </View>
                        <PixelText variant="caption" tone="gold" display>
                          {formatDistance(merchant.distance_meters)}
                        </PixelText>
                      </Pressable>
                    );
                  })}

                {/* MAX 才顯示搜尋輸入,放最下 */}
                {capsuleSnapLevel === 2 && (
                  <View style={{ marginTop: "auto" }}>
                    <PixelTextInput
                      placeholder="搜尋商家名稱 / 描述"
                      value={keyword}
                      onChangeText={setKeyword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      rightAdornment={
                        keyword ? (
                          <Pressable
                            onPress={() => setKeyword("")}
                            hitSlop={8}
                          >
                            <PixelText
                              variant="caption"
                              tone="muted"
                              display
                            >
                              x
                            </PixelText>
                          </Pressable>
                        ) : (
                          <Ionicons
                            name="search"
                            size={16}
                            color={pixelColors.gray500}
                          />
                        )
                      }
                    />
                  </View>
                )}
              </View>
            )}
            {activeTab === "favorites" && capsuleSnapLevel > 0 && (
              <View style={{ gap: 8, flex: 1 }}>
                {subscribedVendors.length === 0 ? (
                  <PixelText variant="body" tone="muted">
                    還沒訂閱任何商家。展開後點下方「掃 QR 訂閱」加入第一家。
                  </PixelText>
                ) : (
                  subscribedVendors
                    .slice(0, capsuleSnapLevel === 1 ? 4 : 10)
                    .map((vendor) => (
                      <Pressable
                        key={vendor.id}
                        onPress={() =>
                          router.push({
                            pathname: "/consumer/vendor/[id]",
                            params: { id: vendor.id, name: vendor.name },
                          })
                        }
                        onLongPress={() =>
                          unsubscribeMerchant(vendor.id, vendor.name)
                        }
                        style={styles.exploreMerchantRow}
                      >
                        <View style={{ flex: 1 }}>
                          <PixelText variant="bodyLg" numberOfLines={1}>
                            {vendor.name}
                          </PixelText>
                          <PixelText
                            variant="caption"
                            tone="muted"
                            numberOfLines={1}
                          >
                            {vendor.meta || vendor.statusLabel || vendor.cuisine}
                          </PixelText>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={pixelColors.gray300}
                        />
                      </Pressable>
                    ))
                )}

                {/* MAX 才顯示掃 QR 按鈕,放最下 */}
                {capsuleSnapLevel === 2 && (
                  <View style={{ marginTop: "auto" }}>
                    <PixelButton
                      label={subLoading ? "..." : "> 掃 QR 訂閱新商家"}
                      tone="pink"
                      fullWidth
                      disabled={subLoading}
                      onPress={async () => {
                        setScanned(false);
                        setScannerOpen(true);
                        if (!cameraPermission?.granted) {
                          await requestCameraPermission();
                        }
                      }}
                    />
                  </View>
                )}
              </View>
            )}
            {activeTab === "notifications" && capsuleSnapLevel > 0 && (
              <View style={{ gap: 8, flex: 1 }}>
                {receivedNotifications.length === 0 ? (
                  <PixelText variant="body" tone="muted">
                    還沒收到推播。訂閱商家後,對方發位置通知就會出現在這裡。
                  </PixelText>
                ) : (
                  receivedNotifications
                    .slice(0, capsuleSnapLevel === 1 ? 3 : 10)
                    .map((n) => (
                      <View
                        key={n.id}
                        style={styles.exploreMerchantRow}
                      >
                        <Ionicons
                          name="notifications"
                          size={20}
                          color={pixelColors.gold}
                        />
                        <View style={{ flex: 1 }}>
                          {n.title ? (
                            <PixelText
                              variant="bodyLg"
                              numberOfLines={1}
                            >
                              {n.title}
                            </PixelText>
                          ) : null}
                          {n.body ? (
                            <PixelText
                              variant="caption"
                              tone="muted"
                              numberOfLines={2}
                            >
                              {n.body}
                            </PixelText>
                          ) : null}
                        </View>
                        <PixelText variant="caption" tone="muted">
                          {formatNotificationTime(n.receivedAt)}
                        </PixelText>
                      </View>
                    ))
                )}
              </View>
            )}
            {activeTab === "profile" && capsuleSnapLevel > 0 && (
              <View style={{ gap: 12, flex: 1 }}>
                {/* 帳號區塊 */}
                <View style={styles.exploreMerchantRow}>
                  <View style={styles.profileAvatar}>
                    <PixelText variant="bodyLg" display tone="inverse">
                      {(user?.name?.charAt(0) || "P").toUpperCase()}
                    </PixelText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelText variant="bodyLg" numberOfLines={1}>
                      {user?.name || "探索者"}
                    </PixelText>
                    <PixelText
                      variant="caption"
                      tone="muted"
                      numberOfLines={1}
                    >
                      {user?.email || ""}
                    </PixelText>
                  </View>
                </View>

                {/* 推播狀態 */}
                <View style={styles.exploreMerchantRow}>
                  <Ionicons
                    name="notifications"
                    size={22}
                    color={
                      profilePushStatus === "ready"
                        ? pixelColors.green
                        : pixelColors.gold
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <PixelText variant="bodyLg">推播通知</PixelText>
                    <PixelText variant="caption" tone="muted">
                      {profilePushStatus === "ready"
                        ? "已完成綁定"
                        : profilePushStatus === "missing"
                          ? "未完成,點右邊修復"
                          : "檢查中..."}
                    </PixelText>
                  </View>
                  {profilePushStatus !== "ready" && (
                    <PixelButton
                      label={profilePushLoading ? "..." : "修復"}
                      tone="gold"
                      size="sm"
                      disabled={profilePushLoading}
                      onPress={setupProfilePush}
                    />
                  )}
                </View>

                {/* MAX 才顯示登出按鈕(重要動作,別誤觸) */}
                {capsuleSnapLevel === 2 && (
                  <View style={{ marginTop: "auto" }}>
                    <PixelButton
                      label="登出"
                      tone="red"
                      fullWidth
                      onPress={handleProfileLogout}
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {/* tab bar — 補償 capsule bottom 位移,絕對螢幕位置不變 */}
          <Animated.View style={[styles.capsuleTabBar, tabBarAnimatedStyle]}>
            {TAB_PILL_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={styles.capsuleTabItem}
                  onPress={() => setActiveTab(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: isActive }}
                >
                  <Ionicons
                    name={item.icon}
                    size={28}
                    color={isActive ? pixelColors.gold : pixelColors.gray300}
                  />
                  <PixelText
                    variant="caption"
                    style={{
                      color: isActive ? pixelColors.gold : pixelColors.gray300,
                      marginTop: 2,
                    }}
                  >
                    {item.label}
                  </PixelText>
                </Pressable>
              );
            })}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Settings 選單 modal */}
      <Modal
        visible={settingsMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsMenuOpen(false)}
      >
        <Pressable
          style={styles.settingsBackdrop}
          onPress={() => setSettingsMenuOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.settingsCard,
              { marginBottom: insets.bottom + 100 },
            ]}
          >
            <SettingsRow
              icon="notifications-outline"
              label="通知設定"
              onPress={() => {
                setSettingsMenuOpen(false);
                Linking.openSettings();
              }}
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              icon="mail-outline"
              label="意見回饋"
              onPress={() => {
                setSettingsMenuOpen(false);
                Linking.openURL(
                  "mailto:feedback@whereisvendor.com?subject=攤位雷達%20意見回饋"
                );
              }}
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="隱私政策"
              onPress={() => {
                setSettingsMenuOpen(false);
                Linking.openURL("https://support.whereisvendor.com/privacy");
              }}
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              icon="information-circle-outline"
              label={`關於  v${Constants.expoConfig?.version ?? "?"}`}
              onPress={() => {
                setSettingsMenuOpen(false);
                Alert.alert(
                  "攤位雷達",
                  `版本 ${Constants.expoConfig?.version ?? "?"}\n\n街邊小吃 × 行動商家\n即時通報、隨叫隨到`
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Phase 3 重做:tab pill 改 footer,handle 只剩細線 -- 暫時隱藏,不 render */}
      {false && (
      <BottomSheet
        snapPoints={SNAP_POINTS}
        index={0}
        animatedIndex={sheetAnimatedIndex}
        enablePanDownToClose={false}
        enableHandlePanningGesture
        enableContentPanningGesture
        // gorhom v5 預設 true,會 auto-size sheet 到 content 高度,snap points 被忽略
        // 關掉才會嚴格依 snap points,peek 才會真的 = 70px
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
        bottomInset={insets.bottom + 8}
        containerStyle={styles.sheetContainerClip}
        style={sheetOuterStyle}
        backgroundStyle={sheetBgStyle}
        handleComponent={() => (
          <Animated.View style={[styles.panelHandleWrap, handleWrapStyle]}>
            <Animated.View style={[styles.panelHandle, handlePillStyle]} />
          </Animated.View>
        )}
      >
        <BottomSheetScrollView
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            // paddingTop 大一點:避開 sheet 上緣 border,peek 時內容自然被 clip 到看不見
            paddingTop: 16,
            // 底部要避開 footer(~65px)不然 scroll 到底時內容被 tab bar 蓋住
            paddingBottom: 80,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
        {activeTab !== "explore" ? (
          <PixelCard
            title={
              TAB_PILL_ITEMS.find((t) => t.id === activeTab)?.label.toUpperCase() ?? ""
            }
            titleTone="purple"
            titleDisplay
            padding={20}
          >
            <View style={{ alignItems: "center", gap: 10 }}>
              <PixelText variant="bodyLg">敬請期待</PixelText>
              <PixelText variant="caption" tone="muted">
                這個分頁的內容正在整合進新的浮島介面,
                {"\n"}下個版本就會出現囉。
              </PixelText>
            </View>
          </PixelCard>
        ) : (
        <>
        {/* QR 訂閱 */}
        <PixelCard title="QR  訂閱通知" titleTone="green" padding={14}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={styles.qrIcon}>
              <Ionicons name="qr-code" size={22} color={pixelColors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText variant="bodyLg">掃 QR 訂閱商家</PixelText>
              <PixelText variant="caption" tone="muted">
                掃描商家提供的 QR Code 即可加入通知
              </PixelText>
            </View>
          </View>

          <View style={{ height: 12 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <PixelButton
                label={subLoading ? "..." : "> 掃碼訂閱"}
                tone="green"
                fullWidth
                disabled={subLoading}
                onPress={async () => {
                  setScanned(false);
                  setScannerOpen(true);
                  if (!cameraPermission?.granted) {
                    await requestCameraPermission();
                  }
                }}
              />
            </View>
            <PixelButton
              label={manualMode ? "收起" : "手動"}
              tone="paper"
              onPress={() => setManualMode((v) => !v)}
              disabled={subLoading}
            />
          </View>

          {manualMode ? (
            <View style={{ marginTop: 12, gap: 10 }}>
              <PixelTextInput
                label="商家 ID"
                placeholder="merchant_id"
                value={merchantId}
                onChangeText={setMerchantId}
                autoCapitalize="none"
                editable={!subLoading}
              />
              <PixelButton
                label={subLoading ? "..." : "> 手動訂閱"}
                tone="blue"
                fullWidth
                disabled={subLoading}
                onPress={onManualSubscribe}
              />
            </View>
          ) : null}
        </PixelCard>

        {/* 公開探索 */}
        <View>
          <View style={styles.capsuleSectionHeader}>
            <View>
              <PixelText variant="caption" tone="gold" display>
                EXPLORE
              </PixelText>
              <PixelText variant="title">公開探索</PixelText>
            </View>
            <Pressable onPress={() => void loadPublicMerchants()}>
              <PixelText variant="body" tone="blue" display>
                {">> RELOAD"}
              </PixelText>
            </Pressable>
          </View>

          {/* 關鍵字搜尋 */}
          <View style={{ marginBottom: 10 }}>
            <PixelTextInput
              placeholder="搜尋商家名稱 / 描述"
              value={keyword}
              onChangeText={setKeyword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              rightAdornment={
                keyword ? (
                  <Pressable onPress={() => setKeyword("")} hitSlop={8}>
                    <PixelText variant="caption" tone="muted" display>
                      x
                    </PixelText>
                  </Pressable>
                ) : (
                  <Ionicons
                    name="search"
                    size={16}
                    color={pixelColors.gray500}
                  />
                )
              }
            />
          </View>

          {/* GPS 狀態 chip */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
            {locationStatus === "granted" ? (
              <PixelChip label="依距離排序" tone="green" active />
            ) : locationStatus === "asking" ? (
              <PixelChip label="取得位置中..." tone="paper" active />
            ) : (
              <PixelChip
                label="點此啟用 GPS"
                tone="paper"
                active
                onPress={() => void requestUserLocation()}
              />
            )}
            {keywordDebounced ? (
              <PixelChip
                label={`搜尋: ${keywordDebounced}`}
                tone="blue"
                active
              />
            ) : null}
          </View>

          {discoveryCategories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              style={{ marginBottom: 12 }}
            >
              <PixelChip
                label="全部"
                tone="gold"
                active={selectedCategorySlug === null}
                onPress={() => setSelectedCategorySlug(null)}
              />
              {discoveryCategories.map((category) => (
                <PixelChip
                  key={category.id}
                  label={getDiscoveryLabel(category)}
                  tone="gold"
                  active={selectedCategorySlug === category.slug}
                  onPress={() => setSelectedCategorySlug(category.slug)}
                />
              ))}
            </ScrollView>
          ) : null}

          {discoveryLoading ? (
            <PixelCard padding={20} titleTone="ink">
              <View style={{ alignItems: "center", gap: 10 }}>
                <PixelLoading label="" size="sm" tone="gold" />
                <PixelText variant="body" tone="muted">
                  載入中…
                </PixelText>
              </View>
            </PixelCard>
          ) : discoveryError ? (
            <PixelCard
              title="ERROR"
              titleTone="red"
              titleDisplay
              padding={14}
              background={pixelColors.surfaceAlt}
            >
              <PixelText variant="body">{discoveryError}</PixelText>
            </PixelCard>
          ) : publicMerchants.length === 0 ? (
            <PixelCard padding={14}>
              <PixelText variant="bodyLg">目前沒有符合條件的商家</PixelText>
              <View style={{ height: 6 }} />
              <PixelText variant="body" tone="muted">
                需要商家完成驗證、設定主要位置與公開探索後,才會出現在這裡。
              </PixelText>
            </PixelCard>
          ) : (
            <View style={{ gap: 10 }}>
              {publicMerchants.map((merchant) => {
                const category = getDiscoveryLabel(
                  merchant.discovery_subcategory || merchant.discovery_category
                );
                const address = merchant.primary_location?.full_address || "";
                return (
                  <Pressable
                    key={merchant.merchant_id}
                    onPress={() =>
                      router.push({
                        pathname: "/consumer/vendor/[id]",
                        params: {
                          id: merchant.merchant_id,
                          name: merchant.store_name,
                          cuisine: category,
                          description: merchant.store_description,
                          address,
                          distance: formatDistance(merchant.distance_meters),
                        },
                      })
                    }
                  >
                    <PixelCard padding={12}>
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <PixelText variant="bodyLg">
                            {merchant.store_name || "未命名商家"}
                          </PixelText>
                          <View style={{ height: 4 }} />
                          <PixelChip label={category} tone="purple" active />
                          {merchant.store_description ? (
                            <>
                              <View style={{ height: 6 }} />
                              <PixelText
                                variant="body"
                                tone="muted"
                                numberOfLines={2}
                              >
                                {merchant.store_description}
                              </PixelText>
                            </>
                          ) : null}
                          {address ? (
                            <>
                              <View style={{ height: 6 }} />
                              <PixelText
                                variant="caption"
                                tone="muted"
                                numberOfLines={1}
                              >
                                * {address}
                              </PixelText>
                            </>
                          ) : null}
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 6 }}>
                          <PixelChip
                            label={formatDistance(merchant.distance_meters)}
                            tone="gold"
                            active
                            display
                          />
                          <PixelText variant="title" tone="gold" display>
                            {">"}
                          </PixelText>
                        </View>
                      </View>
                    </PixelCard>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* 已訂閱 */}
        <View>
          <View style={styles.capsuleSectionHeader}>
            <View>
              <PixelText variant="caption" tone="pink" display>
                SUBSCRIBED
              </PixelText>
              <PixelText variant="title">已訂閱商家</PixelText>
            </View>
            <Pressable onPress={() => router.push("/consumer/favorites")}>
              <PixelText variant="body" tone="pink" display>
                {"MORE >>"}
              </PixelText>
            </Pressable>
          </View>

          {subscriptionsLoading ? (
            <PixelCard padding={20}>
              <View style={{ alignItems: "center", gap: 10 }}>
                <PixelLoading label="" size="sm" tone="pink" />
                <PixelText variant="body" tone="muted">
                  讀取訂閱清單…
                </PixelText>
              </View>
            </PixelCard>
          ) : subscribedVendors.length === 0 ? (
            <PixelCard padding={14}>
              <PixelText variant="bodyLg">還沒有訂閱任何商家</PixelText>
              <View style={{ height: 6 }} />
              <PixelText variant="body" tone="muted">
                用上方掃碼或手動輸入 ID 訂閱第一個商家。
              </PixelText>
            </PixelCard>
          ) : (
            <View style={{ gap: 10 }}>
              {subscribedVendors.map((vendor) => (
                <Pressable
                  key={vendor.id}
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
                >
                  <PixelCard padding={12}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <PixelText variant="bodyLg">{vendor.name}</PixelText>
                        <View style={{ height: 4 }} />
                        <PixelText variant="caption" tone="muted">
                          {vendor.cuisine}
                        </PixelText>
                        <View style={{ height: 8 }} />
                        <PixelChip label={vendor.meta} tone="paper" active />
                      </View>
                      <PixelChip
                        label={vendor.statusLabel}
                        tone="green"
                        active
                      />
                    </View>
                  </PixelCard>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        </>
        )}
        </BottomSheetScrollView>
      </BottomSheet>
      )}

      {/* 掃碼 Modal */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setScannerOpen(false)}
      >
        <SafeAreaView style={styles.scannerRoot} edges={["top", "bottom"]}>
          {cameraPermission?.granted ? (
            <View style={{ flex: 1 }}>
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
                style={[
                  styles.scannerTop,
                  { top: insets.top + 12 },
                ]}
                pointerEvents="box-none"
              >
                <PixelButton
                  label="x 關閉"
                  tone="ink"
                  size="sm"
                  onPress={() => setScannerOpen(false)}
                />
                <PixelChip label="SCAN QR" tone="gold" active display />
                <View style={{ width: 60 }} />
              </View>
              <View style={[styles.scannerBottom, { bottom: 24 }]}>
                <PixelCard
                  title="掃描提示"
                  titleTone="green"
                  padding={12}
                  background={pixelColors.surface}
                >
                  <PixelText variant="body">
                    對準商家提供的 QR Code
                  </PixelText>
                  <View style={{ height: 4 }} />
                  <PixelText variant="caption" tone="muted">
                    掃描成功後會自動完成訂閱並返回首頁。
                  </PixelText>
                </PixelCard>
              </View>
            </View>
          ) : (
            <View style={styles.permissionWrap}>
              <PixelCard
                title="CAMERA  PERMISSION"
                titleTone="red"
                titleDisplay
                padding={20}
                background={pixelColors.surface}
              >
                <View style={{ alignItems: "center", gap: 8 }}>
                  <Ionicons
                    name="camera"
                    size={36}
                    color={pixelColors.gold}
                  />
                  <PixelText variant="bodyLg">需要相機權限</PixelText>
                  <PixelText
                    variant="body"
                    tone="muted"
                    style={{ textAlign: "center" }}
                  >
                    允許相機權限後,才能掃描商家的訂閱 QR Code。
                  </PixelText>
                </View>
                <View style={{ height: 12 }} />
                <PixelButton
                  label="> 允許相機"
                  tone="gold"
                  fullWidth
                  onPress={requestCameraPermission}
                />
              </PixelCard>
            </View>
          )}
        </SafeAreaView>
      </Modal>

    </View>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        pressed ? { backgroundColor: pixelColors.surfaceAlt } : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={pixelColors.gray100} />
      <PixelText variant="body" style={{ flex: 1 }}>
        {label}
      </PixelText>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={pixelColors.gray500}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  // 從零重寫的浮島膠囊 — 純視覺,沒 tab 沒拖曳
  // borderRadius = height / 2 → 兩端呈完整半圓的膠囊形狀
  floatingCapsule: {
    position: "absolute",
    alignSelf: "center",
    // width + height 由 capsuleAnimatedStyle 動態控制,拖曳時 morph
    backgroundColor: pixelColors.surface,
    borderRadius: 40,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    overflow: "hidden",
    flexDirection: "column",
  },
  capsuleTopHandle: {
    // absolute → 不佔 flex 高度,只是視覺裝飾疊在膠囊頂部
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  capsuleTopHandleBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: pixelColors.gray500,
  },
  capsuleContent: {
    flex: 1,
    paddingHorizontal: 20,
    // paddingTop 給 header 一點呼吸空間,避開頂部 drag handle
    paddingTop: 18,
    // tab bar 現在 absolute 貼底,content 要留 padding 不然會被蓋
    paddingBottom: 90,
    gap: 8,
  },
  capsuleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: pixelColors.borderSoft,
  },
  settingsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  settingsCard: {
    width: "88%",
    backgroundColor: pixelColors.surface,
    borderRadius: 16,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: pixelColors.borderSoft,
    marginHorizontal: 8,
  },
  exploreMerchantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: pixelColors.surfaceAlt,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: pixelColors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  capsuleTabBar: {
    // 用 absolute 貼底,不依賴 flex 算高度,任何 sheet 高度下都固定在膠囊底部
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 8,
    paddingVertical: 8,
    // 給 opaque bg,避免拖曳時 content 短暫從 tab 列後方透出
    backgroundColor: pixelColors.surface,
  },
  capsuleTabItem: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
  },
  // 收合時整個 sheet 高 80px,handleWrap 要塞下 handle bar + 一行字
  panelHandleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
    gap: 4,
  },
  panelHandle: {
    backgroundColor: pixelColors.gray500,
    borderRadius: 2,
  },
  // 掛在 gorhom containerStyle → 真正的 outer wrapper,四角一起圓 + clip 所有 sibling
  sheetContainerClip: {
    overflow: "hidden",
    borderRadius: 20,
  },
  // tab pill 底部 footer:solid surface 底(擋 content 洩出)+ 底角自己圓化
  // (不然矩形 footer 疊在圓底 sheet bg 上會蓋掉 sheet 的下方圓角)
  // Footer 全透明 — sheet bg 就是「bar 的形狀」,tab 只是覆在上面的圖標
  // 完全消除 footer/sheet 雙層 rounded corner 打架的問題
  tabPillFooter: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  // Find My 風:icon 上、label 下、垂直堆疊
  tabPillItem: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: pixelRadius * 3,
    minWidth: 60,
  },
  tabPillItemActive: {
    backgroundColor: pixelColors.gold,
  },
  qrIcon: {
    width: 44,
    height: 44,
    backgroundColor: pixelColors.paper,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  scannerRoot: {
    flex: 1,
    backgroundColor: pixelColors.ink,
  },
  scannerTop: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scannerBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
  },
  permissionWrap: {
    flex: 1,
    backgroundColor: pixelColors.bg,
    alignItems: "stretch",
    justifyContent: "center",
    padding: 16,
  },
});
