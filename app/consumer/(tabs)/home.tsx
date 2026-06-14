import { subscriptionsApi } from "@/services/api/subscriptions";
import {
  discoveryApi,
  type DiscoveryCategory,
  type PublicMerchantSearchItem,
} from "@/services/api/discovery";
import { ApiError } from "@/services/api/util";
import { getFcmTokenOrNull, getStableDeviceId } from "@/utils/push";
import { parseMerchantIdFromQrData } from "@/utils/qr/subscriptionQr";
import {
  PixelButton,
  PixelCard,
  PixelChip,
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
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
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

const DISCOVERY_LABELS: Record<string, string> = {
  food: "餐飲",
  experience: "生活體驗",
  other: "其他",
  meal: "正餐",
  snack: "小吃",
  beverage: "飲品",
  goods: "手作選物",
  performance: "展演",
  market: "市集",
  event: "活動",
  tourism_area: "觀光區",
  transit_area: "交通節點",
};

const getDiscoveryLabel = (value?: { slug?: string; name?: string } | null) => {
  if (!value) return "精選商家";
  return DISCOVERY_LABELS[value.slug || ""] || value.name || value.slug || "精選商家";
};

const formatDistance = (meters?: number | null) => {
  if (typeof meters !== "number") return "距離未提供";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
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

  return (
    <View style={styles.root}>
      {/* HUD 頂部欄 */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.hudUser}
          onPress={() => setShowUserMenu(true)}
        >
          <View style={styles.avatar}>
            <PixelText variant="bodyLg" display tone="inverse">
              {(user?.name?.charAt(0) || "P").toUpperCase()}
            </PixelText>
          </View>
          <View style={{ flex: 1 }}>
            <PixelText variant="caption" tone="gold" display>
              PLAYER 2
            </PixelText>
            <PixelText variant="bodyLg">
              {user?.name || "探索者"}
            </PixelText>
          </View>
          <PixelChip label="MENU" tone="paper" active display />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 110,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
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
          <View style={styles.sectionHeader}>
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
                <ActivityIndicator color={pixelColors.gold} />
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
          <View style={styles.sectionHeader}>
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
                <ActivityIndicator color={pixelColors.pink} />
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
      </ScrollView>

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

      {/* User Menu Modal */}
      <Modal
        visible={showUserMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={[styles.menuContainer, { marginTop: insets.top + 56 }]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <PixelCard title="PLAYER  MENU" titleTone="blue" titleDisplay padding={0}>
                <View style={{ padding: 14 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View style={styles.avatar}>
                      <PixelText variant="bodyLg" display tone="inverse">
                        {(user?.name?.charAt(0) || "P").toUpperCase()}
                      </PixelText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <PixelText variant="bodyLg">
                        {user?.name || "探索者"}
                      </PixelText>
                      <PixelText variant="caption" tone="muted">
                        {user?.email || "user@example.com"}
                      </PixelText>
                    </View>
                  </View>
                </View>

                <View style={styles.menuSep} />

                <MenuItem
                  icon="person-outline"
                  label="個人資料"
                  onPress={() => {
                    setShowUserMenu(false);
                    router.push("/consumer/profile");
                  }}
                />
                <MenuItem
                  icon="heart-outline"
                  label="我的收藏"
                  onPress={() => {
                    setShowUserMenu(false);
                    router.push("/consumer/favorites");
                  }}
                />
                <MenuItem
                  icon="settings-outline"
                  label="設定"
                  onPress={() => {
                    setShowUserMenu(false);
                  }}
                />

                <View style={styles.menuSep} />

                <MenuItem
                  icon="log-out-outline"
                  label="登出"
                  tone="red"
                  onPress={async () => {
                    setShowUserMenu(false);
                    await handleLogout();
                  }}
                />
              </PixelCard>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  tone = "default",
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: "default" | "red";
  onPress: () => void;
}) {
  const color = tone === "red" ? pixelColors.red : pixelColors.white;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed ? { backgroundColor: pixelColors.surfaceAlt } : null,
      ]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <PixelText variant="bodyLg" style={{ color }}>
        {label}
      </PixelText>
    </Pressable>
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
    paddingBottom: 12,
    borderBottomWidth: pixelBorderWidth,
    borderBottomColor: pixelColors.ink,
  },
  hudUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: pixelColors.gold,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  menuContainer: {
    marginHorizontal: 16,
  },
  menuSep: {
    height: 2,
    backgroundColor: pixelColors.ink,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
