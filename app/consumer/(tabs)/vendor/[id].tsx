import { styles } from "@/styles/consumer/vendor-detail.styles";
import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelLoading,
  PixelText,
} from "@/components/pixel";
import { menuApi, MenuItem } from "@/services/api/menu";
import { discoveryApi } from "@/services/api/discovery";
import { discoverySubLabel } from "@/utils/discovery/labels";
import {
  subscriptionsApi,
  UserMerchantSubscription,
} from "@/services/api/subscriptions";
import { ApiError } from "@/services/api/util";
import { pixelColors } from "@/theme/pixel";
import { getMerchantDisplayName } from "@/utils/merchant/getMerchantDisplayName";
import { getFcmTokenOrNull, getStableDeviceId } from "@/utils/push";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const buildDeviceInfo = async () => {
  const [deviceId, fcmToken] = await Promise.all([
    getStableDeviceId(),
    getFcmTokenOrNull(),
  ]);
  if (!deviceId || !fcmToken) return undefined;
  return { device_id: deviceId, fcm_token: fcmToken, platform: Platform.OS };
};

export default function VendorDetailScreen() {
  const { id, name, cuisine, is_open, description, address, distance } =
    useLocalSearchParams<{
      id?: string;
      name?: string;
      cuisine?: string;
      is_open?: string;
      description?: string;
      address?: string;
      distance?: string;
    }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const merchantId = useMemo(() => String(id || "").trim(), [id]);

  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [subs, setSubs] = useState<UserMerchantSubscription[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [categoryLabelMap, setCategoryLabelMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    discoveryApi
      .listSubcategories()
      .then((res) => {
        if (cancelled) return;
        const subs = Array.isArray(res.data?.subcategories)
          ? res.data.subcategories
          : [];
        const map: Record<string, string> = {};
        for (const s of subs) {
          map[s.id] = discoverySubLabel({ slug: s.slug, name: s.name });
        }
        setCategoryLabelMap(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const displayName = useMemo(() => {
    const fromRoute = String(name || "").trim();
    if (fromRoute) return fromRoute;
    const matched = subs.find((s) => s.merchant_id === merchantId);
    return getMerchantDisplayName(matched) || "商家";
  }, [name, subs, merchantId]);

  const displayCuisine = useMemo(() => String(cuisine || "").trim(), [cuisine]);
  const displayDescription = useMemo(() => String(description || "").trim(), [description]);
  const displayAddress = useMemo(() => String(address || "").trim(), [address]);
  const displayDistance = useMemo(() => String(distance || "").trim(), [distance]);
  const displayIsOpen = useMemo(() => {
    const raw = String(is_open || "").trim().toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  }, [is_open]);

  const displayMenu = useMemo(
    () =>
      menuItems.map((item) => ({
        key: item.id,
        name: item.name,
        price: item.price,
        popular: item.is_popular,
        description: item.description ?? undefined,
        category: item.category_id
          ? categoryLabelMap[item.category_id] ?? "未分類"
          : undefined,
        prepMinutes: item.prep_minutes,
      })),
    [menuItems, categoryLabelMap]
  );

  const isSubscribed = useMemo(
    () =>
      !!merchantId && subs.some((s) => s.merchant_id === merchantId && s.is_active),
    [merchantId, subs]
  );

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const loadSubscriptions = async () => {
    try {
      setSubscriptionLoading(true);
      const res = await subscriptionsApi.getSubscriptions();
      setSubs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn("load subscriptions failed:", e);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [merchantId]);

  useFocusEffect(
    useCallback(() => {
      if (!merchantId) return;
      let cancelled = false;
      const run = async () => {
        try {
          setMenuLoading(true);
          setMenuError(null);
          const res = await menuApi.getPublicMerchantMenu(merchantId, {
            page: 1,
            page_size: 50,
          });
          if (cancelled) return;
          setMenuItems(Array.isArray(res.data?.items) ? res.data.items : []);
        } catch (e: any) {
          if (cancelled) return;
          console.warn("load public merchant menu failed:", e);
          setMenuItems([]);
          setMenuError("無法載入品項，請稍後再試。");
        } finally {
          if (!cancelled) setMenuLoading(false);
        }
      };
      run();
      return () => { cancelled = true; };
    }, [merchantId])
  );

  const subscribe = async () => {
    if (!merchantId) {
      Alert.alert("錯誤", "缺少商家 ID");
      return;
    }
    try {
      setSubscriptionLoading(true);
      const deviceInfo = await buildDeviceInfo();
      await subscriptionsApi.subscribeMerchant({
        merchant_id: merchantId,
        device_info: deviceInfo,
      });
      Alert.alert("訂閱成功", `已訂閱 ${displayName} 的營業通知`);
      await loadSubscriptions();
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "TOKEN_EXPIRED") return;
      Alert.alert("錯誤", e?.message || "訂閱失敗");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!merchantId) return;
    try {
      setSubscriptionLoading(true);
      await subscriptionsApi.unsubscribeMerchant(merchantId);
      Alert.alert("已取消訂閱", `你將不再收到 ${displayName} 的通知`);
      await loadSubscriptions();
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "TOKEN_EXPIRED") return;
      Alert.alert("錯誤", e?.message || "取消訂閱失敗");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={styles.hudTopRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={pixelColors.ink} />
          </Pressable>
          <View style={styles.hudTitleBlock}>
            <PixelText variant="display" numberOfLines={1}>{displayName}</PixelText>
            {displayCuisine ? (
              <PixelText variant="caption" tone="muted">{displayCuisine}</PixelText>
            ) : null}
          </View>
          {displayIsOpen !== null ? (
            <PixelChip
              label={displayIsOpen ? "營業中" : "休息中"}
              tone={displayIsOpen ? "green" : "paper"}
              active
            />
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {displayDistance ? (
          <View style={styles.statRow}>
            <View style={[styles.statBox, { borderTopColor: pixelColors.blue }]}>
              <PixelText variant="caption" tone="muted">距離</PixelText>
              <View style={{ height: 2 }} />
              <PixelText variant="bodyLg">{displayDistance}</PixelText>
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 120,
          gap: 14,
        }}
      >
        {/* 訂閱狀態 */}
        <PixelCard
          title={isSubscribed ? "已訂閱" : "尚未訂閱"}
          titleTone={isSubscribed ? "green" : "ink"}
          padding={14}
        >
          <View style={styles.subRow}>
            <View style={styles.subDot}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isSubscribed
                      ? pixelColors.green
                      : pixelColors.gray500,
                  },
                ]}
              />
              <PixelText variant="bodyLg">
                {isSubscribed ? "通知已開啟" : "訂閱後可收到營業即時通知"}
              </PixelText>
            </View>
          </View>

          <View style={{ height: 12 }} />
          {isSubscribed ? (
            <PixelButton
              label={subscriptionLoading ? "..." : "取消訂閱"}
              tone="red"
              fullWidth
              disabled={subscriptionLoading}
              onPress={unsubscribe}
            />
          ) : (
            <PixelButton
              label={subscriptionLoading ? "..." : "訂閱通知"}
              tone="green"
              fullWidth
              disabled={subscriptionLoading}
              onPress={subscribe}
            />
          )}
        </PixelCard>

        {/* 商家介紹 */}
        {displayDescription ? (
          <PixelCard title="商家介紹" titleTone="blue" padding={14}>
            <PixelText variant="body">{displayDescription}</PixelText>
          </PixelCard>
        ) : null}

        {/* 地址 */}
        {displayAddress ? (
          <PixelCard title="地址" titleTone="ink" padding={14}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={pixelColors.gold} />
              <PixelText variant="body" style={{ flex: 1 }}>
                {displayAddress}
              </PixelText>
            </View>
          </PixelCard>
        ) : null}

        {/* 品項 */}
        <PixelCard title="品項" titleTone="red" padding={14}>
          <View style={styles.menuHeader}>
            {menuLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <PixelLoading label="" size="sm" tone="gold" />
                <PixelText variant="caption" tone="muted">載入中…</PixelText>
              </View>
            ) : (
              <PixelChip
                label={`共 ${displayMenu.length} 項`}
                tone="paper"
                active
              />
            )}
          </View>

          {menuError ? (
            <View style={styles.warnBox}>
              <PixelText variant="caption" tone="gold">{menuError}</PixelText>
            </View>
          ) : null}

          {!menuLoading && displayMenu.length === 0 && !menuError ? (
            <View style={styles.emptyMenu}>
              <PixelText variant="body" tone="muted">
                這間商家目前尚未上架品項。
              </PixelText>
            </View>
          ) : null}

          <View style={{ gap: 8, marginTop: displayMenu.length > 0 ? 10 : 0 }}>
            {displayMenu.map((item) => (
              <View key={item.key} style={styles.menuItem}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <PixelText variant="bodyLg">{item.name}</PixelText>
                    {item.popular ? (
                      <PixelChip label="HOT" tone="red" active display />
                    ) : null}
                  </View>
                  {item.description ? (
                    <>
                      <View style={{ height: 4 }} />
                      <PixelText variant="caption" tone="muted">
                        {item.description}
                      </PixelText>
                    </>
                  ) : null}
                  {item.category || typeof item.prepMinutes === "number" ? (
                    <>
                      <View style={{ height: 8 }} />
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {item.category ? (
                          <PixelChip label={item.category} tone="paper" active />
                        ) : null}
                        {typeof item.prepMinutes === "number" ? (
                          <PixelText variant="caption" tone="muted">
                            約 {item.prepMinutes} 分鐘
                          </PixelText>
                        ) : null}
                      </View>
                    </>
                  ) : null}
                </View>
                <View style={styles.priceBox}>
                  <PixelText variant="title" tone="gold" display>
                    ${item.price}
                  </PixelText>
                </View>
              </View>
            ))}
          </View>
        </PixelCard>
      </ScrollView>
    </View>
  );
}
