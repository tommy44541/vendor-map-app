import { styles } from "@/styles/consumer/home.styles";
import {
  UnifiedMap,
  type UnifiedMapMarker,
  type UnifiedMapPressEvent,
  type UnifiedMapRef,
} from "@/components/maps/UnifiedMap";
import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelLoading,
  PixelText,
  PixelTextInput,
} from "@/components/pixel";
import { consumerApi, type UserLocation } from "@/services/api/consumer";
import {
  discoveryApi,
  type PublicMerchantSearchItem,
} from "@/services/api/discovery";
import { subscriptionsApi } from "@/services/api/subscriptions";
import { ApiError } from "@/services/api/util";
import { pixelMapStyle } from "@/theme/mapStylePixel";
import { pixelColors } from "@/theme/pixel";
import { discoveryLabel } from "@/utils/discovery/labels";
import { getMerchantDisplayName } from "@/utils/merchant/getMerchantDisplayName";
import { getFcmTokenOrNull, getStableDeviceId } from "@/utils/push";
import {
  getPushNotificationLocation,
  normalizePushNotificationContent,
  type PushNotificationLocation,
  type PushNotificationContentLike,
} from "@/utils/push/notificationContent";
import { parseMerchantIdFromQrData } from "@/utils/qr/subscriptionQr";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "../../../contexts/AuthContext";

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

type ReceivedNotification = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  location: PushNotificationLocation | null;
};

const toReceivedNotification = (
  content?: PushNotificationContentLike | null,
  identifier?: string,
): ReceivedNotification => {
  const normalized = normalizePushNotificationContent(content);

  return {
    id:
      identifier ||
      String(Date.now()) + Math.random().toString(36).slice(2, 6),
    title: normalized.title,
    body: normalized.body,
    receivedAt: new Date().toISOString(),
    location: getPushNotificationLocation(content),
  };
};

const getDiscoveryLabel = (
  value?: { slug?: string | null; name?: string | null } | null,
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
  const {
    openLocations,
    focusRequest,
    focusLatitude,
    focusLongitude,
    focusTitle,
    focusLocationName,
    focusAddress,
  } = useLocalSearchParams<{
    openLocations?: string;
    focusRequest?: string;
    focusLatitude?: string;
    focusLongitude?: string;
    focusTitle?: string;
    focusLocationName?: string;
    focusAddress?: string;
  }>();
  const { user, logout } = useAuth();
  const [profilePushStatus, setProfilePushStatus] = useState<
    "unknown" | "ready" | "missing"
  >("unknown");
  const [profilePushLoading, setProfilePushLoading] = useState(false);
  const [receivedNotifications, setReceivedNotifications] = useState<
    ReceivedNotification[]
  >([]);
  const [focusedNotification, setFocusedNotification] =
    useState<ReceivedNotification | null>(null);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ConsumerTab>("explore");
  const [profileOpenRequest, setProfileOpenRequest] = useState(0);
  const handledOpenLocationsRef = useRef(false);
  const handledFocusRequestRef = useRef<string | null>(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const gearIconRef = useRef<View>(null);
  const [settingsDropdownPos, setSettingsDropdownPos] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [subscribedVendors, setSubscribedVendors] = useState<
    SubscriptionVendor[]
  >([]);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pendingPrimaryId, setPendingPrimaryId] = useState<string | null>(null);
  const [locationActionLoading, setLocationActionLoading] = useState(false);
  const [addLocationMode, setAddLocationMode] = useState(false);
  const [addLocationPicked, setAddLocationPicked] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [addLocationLabel, setAddLocationLabel] = useState("");
  const [addLocationLoading, setAddLocationLoading] = useState(false);
  const mapRef = useRef<UnifiedMapRef>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
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

  const subscribeWithQrData = async (rawQr: string): Promise<boolean> => {
    const raw = String(rawQr || "").trim();
    if (!raw) {
      Alert.alert("無法訂閱", "掃描到的內容是空的，請重試");
      return false;
    }

    const deviceInfo = await getDeviceInfoOrNull();
    if (!deviceInfo) {
      Alert.alert(
        "尚未完成推播設定",
        "請先到「個人」頁面完成推播權限/註冊後再訂閱，才能收到通知。",
        [
          { text: "取消", style: "cancel" },
          {
            text: "前往個人",
            onPress: () => setProfileOpenRequest((value) => value + 1),
          },
        ],
      );
      return false;
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
      return true;
    }

    await subscriptionsApi.processQRSubscription({
      qr_data: raw,
      device_info: deviceInfo,
    });
    return true;
  };

  const onScanSubscribe = async (rawQr: string): Promise<boolean> => {
    try {
      setSubLoading(true);
      const didSubscribe = await subscribeWithQrData(rawQr);
      if (!didSubscribe) return false;
      await loadSubscribedVendors();
      Alert.alert("成功", "已完成訂閱");
      return true;
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "TOKEN_EXPIRED") {
        return false;
      }
      Alert.alert("錯誤", e?.message || "訂閱失敗");
      return false;
    } finally {
      setSubLoading(false);
    }
  };

  const loadUserLocations = useCallback(async () => {
    setLocationsLoading(true);
    try {
      const res = await consumerApi.getUserLocations();
      setUserLocations(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUserLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const handleAddLocationMapPress = useCallback(
    async (e: UnifiedMapPressEvent) => {
      try {
        setAddLocationLoading(true);
        const results = await Location.reverseGeocodeAsync({
          latitude: e.latitude,
          longitude: e.longitude,
        });
        const a = results?.[0];
        const addr = a
          ? [a.street, a.streetNumber, a.city, a.region]
              .filter(Boolean)
              .join(" ")
          : `${e.latitude.toFixed(5)}, ${e.longitude.toFixed(5)}`;
        setAddLocationPicked({
          latitude: e.latitude,
          longitude: e.longitude,
          address: addr,
        });
      } catch {
        setAddLocationPicked({
          latitude: e.latitude,
          longitude: e.longitude,
          address: `${e.latitude.toFixed(5)}, ${e.longitude.toFixed(5)}`,
        });
      } finally {
        setAddLocationLoading(false);
      }
    },
    [],
  );

  const handleAddLocationGPS = useCallback(async () => {
    try {
      setAddLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("需要位置權限", "請允許存取位置後再試");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const results = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const a = results?.[0];
      const addr = a
        ? [a.street, a.streetNumber, a.city, a.region].filter(Boolean).join(" ")
        : `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`;
      setAddLocationPicked({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: addr,
      });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch {
      Alert.alert("錯誤", "無法取得 GPS 位置");
    } finally {
      setAddLocationLoading(false);
    }
  }, []);

  const saveAddLocation = useCallback(async () => {
    if (!addLocationPicked) {
      Alert.alert("提示", "請先點選地圖或使用 GPS 選取位置");
      return;
    }
    const label = addLocationLabel.trim();
    if (!label) {
      Alert.alert("提示", "請輸入位置名稱");
      return;
    }
    try {
      setAddLocationLoading(true);
      await consumerApi.createUserLocation({
        label,
        full_address: addLocationPicked.address,
        latitude: addLocationPicked.latitude,
        longitude: addLocationPicked.longitude,
        is_primary: false,
        is_active: true,
      });
      setAddLocationMode(false);
      setAddLocationPicked(null);
      setAddLocationLabel("");
      await loadUserLocations();
      setLocationModalOpen(true);
    } catch (e: any) {
      Alert.alert("錯誤", e?.message || "新增位置失敗");
    } finally {
      setAddLocationLoading(false);
    }
  }, [addLocationPicked, addLocationLabel, loadUserLocations]);

  const cancelAddLocation = useCallback(() => {
    setAddLocationMode(false);
    setAddLocationPicked(null);
    setAddLocationLabel("");
    setLocationModalOpen(true);
  }, []);

  const confirmLocationChange = useCallback(async () => {
    if (!pendingPrimaryId) return;
    const loc = userLocations.find((l) => l.ID === pendingPrimaryId);
    if (!loc) return;
    try {
      setLocationActionLoading(true);
      // Demote existing primary first to avoid backend unique constraint
      const oldPrimary = userLocations.find(
        (l) => l.IsPrimary && l.IsActive && l.ID !== pendingPrimaryId,
      );
      if (oldPrimary) {
        await consumerApi.updateUserLocation(oldPrimary.ID, {
          label: oldPrimary.Label,
          is_active: true,
          is_primary: false,
        });
      }
      await consumerApi.updateUserLocation(pendingPrimaryId, {
        label: loc.Label,
        is_active: true,
        is_primary: true,
      });
      await loadUserLocations();
      setPendingPrimaryId(null);
      setLocationModalOpen(false);
    } catch (e: any) {
      Alert.alert("錯誤", e?.message || "更新失敗");
    } finally {
      setLocationActionLoading(false);
    }
  }, [pendingPrimaryId, userLocations, loadUserLocations]);

  const disableLocation = useCallback(
    async (id: string) => {
      const loc = userLocations.find((l) => l.ID === id);
      if (!loc) return;
      try {
        setLocationActionLoading(true);
        await consumerApi.updateUserLocation(id, {
          label: loc.Label,
          is_active: false,
          is_primary: false,
        });
        if (pendingPrimaryId === id) setPendingPrimaryId(null);
        await loadUserLocations();
      } catch (e: any) {
        Alert.alert("錯誤", e?.message || "停用失敗");
      } finally {
        setLocationActionLoading(false);
      }
    },
    [userLocations, pendingPrimaryId, loadUserLocations],
  );

  const deleteLocation = useCallback(
    async (id: string) => {
      Alert.alert("刪除位置", "確定要刪除此位置嗎？", [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            try {
              setLocationActionLoading(true);
              await consumerApi.deleteUserLocation(id);
              if (pendingPrimaryId === id) setPendingPrimaryId(null);
              await loadUserLocations();
            } catch (e: any) {
              Alert.alert("錯誤", e?.message || "刪除失敗");
            } finally {
              setLocationActionLoading(false);
            }
          },
        },
      ]);
    },
    [pendingPrimaryId, loadUserLocations],
  );

  const checkProfilePushStatus = useCallback(async () => {
    try {
      const [permission, token] = await Promise.all([
        (await import("@/utils/push")).getPushPermissionStatus(),
        getFcmTokenOrNull(),
      ]);
      setProfilePushStatus(
        permission === "granted" && !!token ? "ready" : "missing",
      );
    } catch {
      setProfilePushStatus("missing");
    }
  }, []);

  useEffect(() => {
    if (activeTab === "profile") {
      void checkProfilePushStatus();
      void loadUserLocations();
    }
  }, [activeTab, checkProfilePushStatus, loadUserLocations]);

  // 監聽 in-app 收到的推播,累積成通知歷史(最多 20 筆)
  useEffect(() => {
    let sub: any = null;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        sub = Notifications.addNotificationReceivedListener((n) => {
          const content = n?.request?.content;
          const identifier = n?.request?.identifier;
          const next = toReceivedNotification(content, identifier);
          setReceivedNotifications((prev) => {
            if (prev.some((item) => item.id === next.id)) {
              return prev;
            }
            return [next, ...prev].slice(0, 20);
          });
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
      if (!user?.id) {
        throw new Error("找不到登入中的使用者");
      }
      setProfilePushLoading(true);
      const mod = await import("@/utils/push");
      const res = await mod.onUserAuthenticated({
        requestPermissionIfNeeded: true,
        userId: user.id,
      });
      await checkProfilePushStatus();
      Alert.alert(
        res.ok ? "完成" : "未完成",
        res.ok ? "推播已設定完成" : `未完成:${res.step}`,
      );
    } catch (e: any) {
      Alert.alert("錯誤", e?.message || "推播設定失敗");
    } finally {
      setProfilePushLoading(false);
    }
  }, [checkProfilePushStatus, user?.id]);

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
    [],
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
        })),
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

      const merchantsRes = await discoveryApi.searchPublicMerchants({
        ...(keywordDebounced ? { keyword: keywordDebounced } : {}),
        ...(userLocation
          ? {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }
          : {}),
        page: 1,
        page_size: 6,
      });

      if (!isLatest()) return;

      setPublicMerchants(
        Array.isArray(merchantsRes.data?.merchants)
          ? merchantsRes.data.merchants
          : [],
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
  }, [keywordDebounced, userLocation]);

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
    }, [loadPublicMerchants, loadSubscribedVendors]),
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
    [userLocation],
  );

  // publicMerchants → map markers,過濾沒座標的
  const mapMarkers: UnifiedMapMarker[] = useMemo(
    () =>
      publicMerchants
        .filter(
          (m) => m.primary_location?.latitude && m.primary_location?.longitude,
        )
        .map((m) => ({
          id: m.merchant_id,
          latitude: m.primary_location!.latitude,
          longitude: m.primary_location!.longitude,
          title: m.store_name,
          description: m.store_description ?? undefined,
          pinColor: pixelColors.gold,
        })),
    [publicMerchants],
  );

  const focusedNotificationMarker: UnifiedMapMarker | null = useMemo(() => {
    const location = focusedNotification?.location;
    if (!location) return null;

    return {
      id: `notification-${focusedNotification.id}`,
      latitude: location.latitude,
      longitude: location.longitude,
      title: location.locationName || focusedNotification.title,
      description: location.fullAddress || focusedNotification.body,
      pinColor: pixelColors.red,
    };
  }, [focusedNotification]);

  // 只在 dark mode 套像素 muted 配色;light mode 走系統預設(Google 彩色 / Apple 淡色)
  const colorScheme = useColorScheme();
  const mapCustomStyle = colorScheme === "dark" ? pixelMapStyle : undefined;

  // === 浮島膠囊拖曳 + 三段 snap ===
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  // 360 是一般/大螢幕手機的舒適寬度上限;窄螢幕手機（寬度接近或小於 360）
  // 改保留固定兩側邊距，避免膠囊邊緣跟螢幕邊緣相切。
  const CAPSULE_SIDE_MARGIN = 16;
  const CAPSULE_PEEK_WIDTH = Math.min(360, screenWidth - CAPSULE_SIDE_MARGIN * 2);
  const CAPSULE_MID_WIDTH = Math.round(screenWidth * 0.95);
  const CAPSULE_MAX_WIDTH = screenWidth;
  const CAPSULE_SNAP_MIN = 80;
  const CAPSULE_SNAP_MID = Math.round(screenHeight * 0.4);
  const CAPSULE_SNAP_MAX = Math.round(screenHeight * 0.92);
  const capsuleHeight = useSharedValue(CAPSULE_SNAP_MIN);
  const capsuleStartHeight = useSharedValue(CAPSULE_SNAP_MIN);
  // 0 = peek, 1 = mid, 2 = max。用來決定 render 多少內容
  const [capsuleSnapLevel, setCapsuleSnapLevel] = useState<0 | 1 | 2>(0);

  const focusNotificationOnMap = useCallback(
    (notification: ReceivedNotification) => {
      const location = notification.location;
      if (!location) {
        Alert.alert("無法顯示位置", "這則通知沒有包含有效的攤商位置資料。");
        return;
      }

      setFocusedNotification(notification);
      setActiveTab("explore");
      capsuleHeight.value = withSpring(CAPSULE_SNAP_MIN, {
        damping: 28,
        stiffness: 240,
        overshootClamping: true,
      });
      setCapsuleSnapLevel(0);

      requestAnimationFrame(() => {
        mapRef.current?.animateToRegion(
          {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          },
          700,
        );
      });
    },
    [CAPSULE_SNAP_MIN, capsuleHeight],
  );

  useEffect(() => {
    if (!focusRequest || handledFocusRequestRef.current === focusRequest) return;

    const latitude = Number(focusLatitude);
    const longitude = Number(focusLongitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return;
    }

    handledFocusRequestRef.current = focusRequest;
    focusNotificationOnMap({
      id: `route-${focusRequest}`,
      title: focusTitle || "攤商通知",
      body: focusAddress || focusLocationName || "攤商通知位置",
      receivedAt: new Date().toISOString(),
      location: {
        latitude,
        longitude,
        locationName: focusLocationName,
        fullAddress: focusAddress,
      },
    });
  }, [
    focusAddress,
    focusLatitude,
    focusLocationName,
    focusLongitude,
    focusNotificationOnMap,
    focusRequest,
    focusTitle,
  ]);

  useEffect(() => {
    if (profileOpenRequest === 0) return;

    setActiveTab("profile");
    capsuleHeight.value = withSpring(CAPSULE_SNAP_MID, {
      damping: 28,
      stiffness: 240,
    });
    setCapsuleSnapLevel(1);
  }, [CAPSULE_SNAP_MID, capsuleHeight, profileOpenRequest]);

  useEffect(() => {
    if (
      openLocations !== "1" ||
      handledOpenLocationsRef.current
    ) {
      return;
    }

    handledOpenLocationsRef.current = true;
    setActiveTab("profile");
    setLocationModalOpen(true);
    void loadUserLocations();
    capsuleHeight.value = withSpring(CAPSULE_SNAP_MID, {
      damping: 28,
      stiffness: 240,
    });
    setCapsuleSnapLevel(1);
  }, [
    CAPSULE_SNAP_MID,
    capsuleHeight,
    loadUserLocations,
    openLocations,
  ]);

  // 點擊推播通知開啟 app(冷啟動或背景喚醒)→ 直接切到通知頁並展開膠囊,
  // 同時把該則通知補進歷史(冷啟動時不會經過上面的 addNotificationReceivedListener)
  useEffect(() => {
    let sub: any = null;
    const openNotificationsTab = (
      content?: PushNotificationContentLike | null,
      identifier?: string,
    ) => {
      if (content) {
        const next = toReceivedNotification(content, identifier);
        setReceivedNotifications((prev) => {
          if (prev.some((item) => item.id === next.id)) {
            return prev;
          }
          return [next, ...prev].slice(0, 20);
        });
      }
      setActiveTab("notifications");
      capsuleHeight.value = withSpring(CAPSULE_SNAP_MID, {
        damping: 28,
        stiffness: 240,
      });
      setCapsuleSnapLevel(1);
    };

    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        // 冷啟動:app 完全關閉時點通知打開,要補抓造成這次啟動的 response
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();
        const lastContent = lastResponse?.notification?.request?.content;
        if (lastContent) {
          openNotificationsTab(
            lastContent,
            lastResponse?.notification?.request?.identifier,
          );
        }

        // app 還在背景(未被殺)時點通知喚醒
        sub = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            openNotificationsTab(
              response?.notification?.request?.content,
              response?.notification?.request?.identifier,
            );
          },
        );
      } catch (e) {
        console.warn("expo-notifications response listener not available:", e);
      }
    })();

    return () => {
      try {
        sub?.remove?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        Math.min(CAPSULE_SNAP_MAX, next),
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
        damping: 28,
        stiffness: 240,
        velocity: velocity * 0.12,
        overshootClamping: closestIdx === 0,
      });
      runOnJS(setCapsuleSnapLevel)(closestIdx as 0 | 1 | 2);
    });

  // MID 時左右各的 gap(寬度差的一半)— bar 底部貼齊這個 gap,四邊等距
  const midSideGap = Math.max(
    (screenWidth - CAPSULE_MID_WIDTH) / 2,
    insets.bottom + 8,
  );
  // Tab bar 螢幕底部固定 Y — 一次調這裡,capsule MIN 位置 + tab bar 補償都同步
  const TAB_BAR_FIXED_BOTTOM = insets.bottom + 8;

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
    opacity: interpolate(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, CAPSULE_SNAP_MID, CAPSULE_SNAP_MAX],
      [0.92, 0.92, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // Tab bar 螢幕位置固定在 TAB_BAR_FIXED_BOTTOM,補償 capsule 下移
  const tabBarAnimatedStyle = useAnimatedStyle(() => {
    const capsuleBottom = interpolate(
      capsuleHeight.value,
      [CAPSULE_SNAP_MIN, CAPSULE_SNAP_MID, CAPSULE_SNAP_MAX],
      [TAB_BAR_FIXED_BOTTOM, midSideGap, 0],
      Extrapolation.CLAMP,
    );
    return {
      bottom: TAB_BAR_FIXED_BOTTOM - capsuleBottom,
    };
  });

  return (
    <View style={styles.root}>
      {/* 全螢幕地圖底層 */}
      <UnifiedMap
        ref={mapRef}
        region={mapRegion}
        style={StyleSheet.absoluteFill}
        markers={[
          ...mapMarkers,
          ...(focusedNotificationMarker ? [focusedNotificationMarker] : []),
          ...(addLocationMode && addLocationPicked
            ? [
                {
                  id: "add-location-pick",
                  latitude: addLocationPicked.latitude,
                  longitude: addLocationPicked.longitude,
                  title: addLocationLabel || "新位置",
                  pinColor: pixelColors.blue,
                },
              ]
            : []),
        ]}
        customMapStyle={mapCustomStyle}
        showsUserLocation
        onPress={addLocationMode ? handleAddLocationMapPress : undefined}
      />

      {/* 重寫中:整個膠囊是 drag surface,content 不 scroll,任何位置拖曳都控 sheet 高度 */}
      <GestureDetector gesture={capsulePanGesture}>
        <Animated.View style={[styles.floatingCapsule, capsuleAnimatedStyle]}>
          {/* content 區 — 純 View 不 scroll,單純 placeholder 顯示 */}
          <View
            style={[
              styles.capsuleContent,
              // tab bar 實際高度約 73px,這裡抓 88 留一點緩衝就好 — 之前抓
              // CAPSULE_SNAP_MIN(80)+24 過度保留,在螢幕較矮的手機上會把
              // 中段可用高度壓縮到不夠放空狀態的 icon + 文字。
              { paddingBottom: 88 + insets.bottom },
            ]}
          >
            {/* 共用 header:標題 + 齒輪(peek 時隱藏)*/}
            {capsuleSnapLevel > 0 && (
              <View style={styles.capsuleSectionHeader}>
                <PixelText variant="display">
                  {TAB_PILL_ITEMS.find((t) => t.id === activeTab)?.label ?? ""}
                </PixelText>
                <View ref={gearIconRef}>
                  <Pressable
                    onPress={() => {
                      gearIconRef.current?.measure(
                        (_x, _y, width, height, pageX, pageY) => {
                          setSettingsDropdownPos({
                            top: pageY + height + 6,
                            right: screenWidth - pageX,
                          });
                          setSettingsMenuOpen(true);
                        },
                      );
                    }}
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
              </View>
            )}

            {activeTab === "explore" && capsuleSnapLevel > 0 && (
              <View style={{ gap: 8, flex: 1 }}>
                {discoveryLoading ? (
                  <View style={{ alignItems: "center", paddingVertical: 10 }}>
                    <PixelLoading label="" size="sm" tone="gold" />
                  </View>
                ) : discoveryError ? (
                  <View style={{ alignItems: "center", paddingVertical: 10 }}>
                    <PixelText variant="caption" tone="red">
                      {discoveryError}
                    </PixelText>
                  </View>
                ) : publicMerchants.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 10, gap: 6 }}>
                    <Ionicons name="search-outline" size={22} color={pixelColors.gray300} />
                    <PixelText variant="caption" tone="muted">
                      {keywordDebounced ? `找不到「${keywordDebounced}」相關商家` : "附近目前沒有商家"}
                    </PixelText>
                  </View>
                ) : null}
                {!discoveryLoading && publicMerchants
                  .slice(0, capsuleSnapLevel === 1 ? 4 : 10)
                  .map((merchant) => {
                    const cat = getDiscoveryLabel(
                      merchant.discovery_subcategory ||
                        merchant.discovery_category,
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
                                merchant.distance_meters,
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
                        <Ionicons
                          name="search"
                          size={16}
                          color={pixelColors.gray500}
                        />
                      }
                    />
                  </View>
                )}
              </View>
            )}
            {activeTab === "favorites" && capsuleSnapLevel > 0 && (
              <View style={{ gap: 8, flex: 1 }}>
                {subscriptionsLoading ? (
                  <View style={{ alignItems: "center", paddingVertical: 10 }}>
                    <PixelLoading label="" size="sm" tone="pink" />
                  </View>
                ) : subscribedVendors.length === 0 ? (
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
                            {vendor.meta ||
                              vendor.statusLabel ||
                              vendor.cuisine}
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
                      tone="gold"
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
                      <Pressable
                        key={n.id}
                        onPress={() => focusNotificationOnMap(n)}
                        style={({ pressed }) => [
                          styles.exploreMerchantRow,
                          styles.notificationRow,
                          pressed && styles.notificationRowPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${n.title}，在地圖查看位置`}
                        accessibilityHint="收起通知並將地圖移動到攤商發出通知的位置"
                      >
                        <Ionicons
                          name={n.location ? "location" : "notifications"}
                          size={20}
                          color={n.location ? pixelColors.red : pixelColors.gold}
                        />
                        <View style={{ flex: 1 }}>
                          <PixelText variant="bodyLg" numberOfLines={1}>
                            {n.title}
                          </PixelText>
                          <PixelText
                            variant="caption"
                            tone="muted"
                            numberOfLines={2}
                          >
                            {n.body}
                          </PixelText>
                        </View>
                        <PixelText variant="caption" tone="muted">
                          {formatNotificationTime(n.receivedAt)}
                        </PixelText>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={pixelColors.gray500}
                        />
                      </Pressable>
                    ))
                )}
              </View>
            )}
            {activeTab === "profile" && capsuleSnapLevel > 0 && (
              <View style={{ flex: 1 }}>
                {/* 第一段(MID)只留「我的位置」;其餘拉到 MAX 才顯示 */}
                {capsuleSnapLevel === 2 && (
                  <>
                    {/* 主要位置描述列 */}
                    <PixelText
                      variant="caption"
                      tone="muted"
                      numberOfLines={2}
                      style={{ marginBottom: 6 }}
                    >
                      {locationsLoading
                        ? "讀取位置中..."
                        : (userLocations.find((l) => l.IsPrimary && l.IsActive)
                            ?.FullAddress ?? "尚未設定主要位置")}
                    </PixelText>

                    <View style={styles.profileDivider} />
                  </>
                )}

                {/* 我的位置 → 開位置管理 Modal */}
                <Pressable
                  onPress={() => {
                    setLocationModalOpen(true);
                    void loadUserLocations();
                  }}
                  style={styles.profileLocationRow}
                  accessibilityRole="button"
                >
                  <View style={styles.profileLocationIconBlue}>
                    <Ionicons
                      name="navigate"
                      size={18}
                      color={pixelColors.white}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelText variant="bodyLg">我的位置</PixelText>
                    <PixelText variant="caption" tone="muted">
                      {locationStatus === "granted"
                        ? "GPS 已啟用"
                        : "點此管理儲存位置"}
                    </PixelText>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={pixelColors.gray500}
                  />
                </Pressable>

                {capsuleSnapLevel === 2 && (
                  <>
                    <View style={styles.profileDivider} />

                    {/* 推播通知 */}
                    <View style={styles.profileLocationRow}>
                      <View
                        style={[
                          styles.profileLocationIconBlue,
                          {
                            backgroundColor:
                              profilePushStatus === "ready"
                                ? pixelColors.green
                                : pixelColors.gold,
                          },
                        ]}
                      >
                        <Ionicons
                          name="notifications"
                          size={18}
                          color={pixelColors.ink}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <PixelText variant="bodyLg">推播通知</PixelText>
                        <PixelText variant="caption" tone="muted">
                          {profilePushStatus === "ready"
                            ? "已完成綁定"
                            : profilePushStatus === "missing"
                              ? "未完成，點修復完成設定"
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
                  </>
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

          {/* drag handle — 最後渲染確保在 capsuleTabBar 上層 */}
          <View style={styles.capsuleTopHandle} pointerEvents="none">
            <View style={styles.capsuleTopHandleBar} />
          </View>
        </Animated.View>
      </GestureDetector>

      {/* 位置管理 Modal */}
      <Modal
        visible={locationModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setLocationModalOpen(false);
          setPendingPrimaryId(null);
        }}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.locationModalBackdrop}>
            <View
              style={[
                styles.locationModalContainer,
                { height: CAPSULE_SNAP_MAX },
              ]}
            >
              {/* Header */}
              <View style={styles.locationModalHeader}>
                <Pressable
                  onPress={() => {
                    setLocationModalOpen(false);
                    setPendingPrimaryId(null);
                  }}
                  hitSlop={10}
                  style={styles.locationModalHeaderBtn}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={pixelColors.ink}
                  />
                </Pressable>
                <PixelText
                  variant="title"
                  style={{ flex: 1, textAlign: "center" }}
                >
                  位置管理
                </PixelText>
                <Pressable
                  onPress={confirmLocationChange}
                  hitSlop={10}
                  disabled={!pendingPrimaryId || locationActionLoading}
                  style={styles.locationModalHeaderBtn}
                >
                  <Ionicons
                    name="checkmark"
                    size={22}
                    color={
                      pendingPrimaryId && !locationActionLoading
                        ? pixelColors.blue
                        : pixelColors.gray500
                    }
                  />
                </Pressable>
              </View>

              {/* 當前主要位置描述 */}
              <View style={styles.locationModalDescription}>
                <Ionicons name="location" size={14} color={pixelColors.blue} />
                <PixelText
                  variant="caption"
                  tone="muted"
                  numberOfLines={2}
                  style={{ flex: 1 }}
                >
                  {(() => {
                    const effectiveLoc = pendingPrimaryId
                      ? userLocations.find((l) => l.ID === pendingPrimaryId)
                      : userLocations.find((l) => l.IsPrimary && l.IsActive);
                    return effectiveLoc?.FullAddress ?? "尚未設定主要位置";
                  })()}
                </PixelText>
              </View>

              <View style={styles.profileDivider} />

              {/* 位置清單 */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
              >
                {locationsLoading ? (
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <PixelLoading label="" size="sm" tone="blue" />
                  </View>
                ) : userLocations.filter((l) => l.IsActive).length === 0 ? (
                  <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                    <PixelText variant="body" tone="muted">
                      還沒有儲存的位置。點下方「新增位置」開始加入。
                    </PixelText>
                  </View>
                ) : (
                  userLocations
                    .filter((l) => l.IsActive)
                    .map((loc) => {
                      const currentPrimaryId = userLocations.find(
                        (l) => l.IsPrimary && l.IsActive,
                      )?.ID;
                      const isPrimary =
                        (pendingPrimaryId ?? currentPrimaryId) === loc.ID;
                      return (
                        <ReanimatedSwipeable
                          key={loc.ID}
                          friction={2}
                          rightThreshold={40}
                          containerStyle={styles.locationSwipeContainer}
                          renderRightActions={() => (
                            <View style={styles.locationSwipeActions}>
                              <Pressable
                                style={[
                                  styles.locationSwipeBtn,
                                  { backgroundColor: pixelColors.gray500 },
                                ]}
                                onPress={() => disableLocation(loc.ID)}
                                disabled={locationActionLoading}
                              >
                                <PixelText
                                  variant="caption"
                                  style={{ color: pixelColors.white }}
                                >
                                  停用
                                </PixelText>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.locationSwipeBtn,
                                  { backgroundColor: pixelColors.red },
                                ]}
                                onPress={() => deleteLocation(loc.ID)}
                                disabled={locationActionLoading}
                              >
                                <PixelText
                                  variant="caption"
                                  style={{ color: pixelColors.white }}
                                >
                                  刪除
                                </PixelText>
                              </Pressable>
                            </View>
                          )}
                        >
                          <Pressable
                            onPress={() => setPendingPrimaryId(loc.ID)}
                            style={styles.locationListItem}
                          >
                            <View style={{ flex: 1 }}>
                              <PixelText variant="bodyLg" numberOfLines={1}>
                                {loc.Label}
                              </PixelText>
                              <PixelText
                                variant="caption"
                                tone="muted"
                                numberOfLines={2}
                              >
                                {loc.FullAddress}
                              </PixelText>
                            </View>
                            {isPrimary && (
                              <Ionicons
                                name="checkmark"
                                size={22}
                                color={pixelColors.blue}
                              />
                            )}
                          </Pressable>
                        </ReanimatedSwipeable>
                      );
                    })
                )}
                <View style={{ height: 8 }} />
              </ScrollView>

              {/* 新增位置 footer 按鈕 */}
              <View
                style={[
                  styles.locationModalFooter,
                  { paddingBottom: insets.bottom + 12 },
                ]}
              >
                <PixelButton
                  label="+ 新增位置"
                  tone="blue"
                  fullWidth
                  onPress={() => {
                    setLocationModalOpen(false);
                    setAddLocationMode(true);
                    setAddLocationPicked(null);
                    setAddLocationLabel("");
                    capsuleHeight.value = withSpring(CAPSULE_SNAP_MIN, {
                      damping: 28,
                      stiffness: 240,
                      overshootClamping: true,
                    });
                    setCapsuleSnapLevel(0);
                  }}
                />
              </View>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>

      {/* 新增位置面板（覆蓋在背景地圖上） */}
      {addLocationMode && (
        <View
          style={[
            styles.addLocationPanel,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* 提示：未選點時顯示 */}
          {!addLocationPicked && !addLocationLoading && (
            <View style={styles.addLocationHint}>
              <Ionicons
                name="finger-print"
                size={14}
                color={pixelColors.gray300}
              />
              <PixelText variant="caption" tone="muted">
                點選地圖選取位置，或使用下方 GPS 按鈕
              </PixelText>
            </View>
          )}

          {/* 已選地址預覽 */}
          {(addLocationPicked || addLocationLoading) && (
            <View style={styles.addLocationAddressBox}>
              <Ionicons name="location" size={14} color={pixelColors.blue} />
              <PixelText
                variant="caption"
                tone="muted"
                numberOfLines={2}
                style={{ flex: 1 }}
              >
                {addLocationLoading
                  ? "取得地址中..."
                  : addLocationPicked?.address}
              </PixelText>
            </View>
          )}

          {/* 位置名稱輸入 */}
          <PixelTextInput
            placeholder="位置名稱（例如：家、公司）"
            value={addLocationLabel}
            onChangeText={setAddLocationLabel}
            maxLength={30}
            editable={!addLocationLoading}
            returnKeyType="done"
          />

          {/* 操作按鈕列 */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PixelButton
              label="× 取消"
              tone="paper"
              onPress={cancelAddLocation}
              disabled={addLocationLoading}
            />
            <PixelButton
              label={addLocationLoading ? "..." : "GPS"}
              tone="blue"
              onPress={handleAddLocationGPS}
              disabled={addLocationLoading}
            />
            <View style={{ flex: 1 }}>
              <PixelButton
                label={addLocationLoading ? "..." : "> 儲存"}
                tone="gold"
                fullWidth
                onPress={saveAddLocation}
                disabled={addLocationLoading || !addLocationPicked}
              />
            </View>
          </View>
        </View>
      )}

      {/* Settings dropdown */}
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
              settingsDropdownPos
                ? {
                    position: "absolute",
                    top: settingsDropdownPos.top,
                    right: settingsDropdownPos.right,
                  }
                : null,
            ]}
          >
            <SettingsRow
              label="通知設定"
              onPress={() => {
                setSettingsMenuOpen(false);
                Linking.openSettings();
              }}
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              label="隱私政策"
              onPress={() => {
                setSettingsMenuOpen(false);
                Linking.openURL("https://support.whereisvendor.com/privacy");
              }}
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              label={`關於  v${Constants.expoConfig?.version ?? "?"}`}
              onPress={() => {
                setSettingsMenuOpen(false);
                Alert.alert(
                  "攤位雷達",
                  `版本 ${Constants.expoConfig?.version ?? "?"}\n\n街邊小吃 × 行動商家\n即時通報、隨叫隨到`,
                );
              }}
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              label="登出"
              onPress={() => {
                setSettingsMenuOpen(false);
                handleProfileLogout();
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

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
                style={[styles.scannerTop, { top: insets.top + 12 }]}
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
                  <PixelText variant="body">對準商家提供的 QR Code</PixelText>
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
                  <Ionicons name="camera" size={36} color={pixelColors.gold} />
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
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.settingsRow}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <PixelText variant="body" style={{ flex: 1 }}>
        {label}
      </PixelText>
    </Pressable>
  );
}
