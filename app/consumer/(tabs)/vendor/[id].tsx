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
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { getMerchantDisplayName } from "@/utils/merchant/getMerchantDisplayName";
import { getFcmTokenOrNull, getStableDeviceId } from "@/utils/push";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {

  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MockMenuItem = {
  name: string;
  price: number;
  popular?: boolean;
  description?: string;
  category?: string;
  prepMinutes?: number;
};

type MockVendorDetail = {
  name: string;
  cuisine: string;
  rating: number;
  distance: string;
  eta: string;
  isOpen: boolean;
  tags: string[];
  description: string;
  address: string;
  businessHours: string;
  recentUpdate: string;
  menu: MockMenuItem[];
};

const defaultMenu: MockMenuItem[] = [
  { name: "手作帆布小包", price: 480, popular: true, category: "主打", prepMinutes: 15 },
  { name: "限定香氛蠟燭", price: 320, popular: true, category: "主打", prepMinutes: 10 },
  { name: "客製化吊飾", price: 180, category: "小品", prepMinutes: 8 },
  { name: "品牌明信片組", price: 120, category: "小品", prepMinutes: 3 },
];


const getMockVendorDetail = (merchantId: string): MockVendorDetail => {
  const samples: Record<string, MockVendorDetail> = {
    "1": {
      name: "阿婆臭豆腐",
      cuisine: "台灣小吃",
      rating: 4.8,
      distance: "0.3 km",
      eta: "約 4 分鐘",
      isOpen: true,
      tags: ["酥炸", "在地老店", "晚餐推薦"],
      description:
        "現炸臭豆腐搭配泡菜，外酥內嫩，醬香濃郁。下午到晚餐時段固定出攤。",
      address: "台北市大安區和平東路三段 100 號（近科技大樓）",
      businessHours: "15:30 - 21:30",
      recentUpdate: "今日辣度調整為中辣，歡迎加點泡菜。",
      menu: [
        { name: "招牌臭豆腐", price: 70, popular: true },
        { name: "綜合拼盤", price: 95, popular: true },
        { name: "泡菜加量", price: 15 },
      ],
    },
    "2": {
      name: "老王牛肉麵",
      cuisine: "麵食",
      rating: 4.6,
      distance: "0.5 km",
      eta: "約 7 分鐘",
      isOpen: true,
      tags: ["牛肉麵", "份量大", "湯頭濃郁"],
      description:
        "每日熬煮紅燒湯頭，牛腱心軟嫩入味。主打高 CP 值與快速出餐。",
      address: "台北市信義區松仁路 88 號（夜市口）",
      businessHours: "11:30 - 14:00 / 17:00 - 22:00",
      recentUpdate: "晚間限定加麵不加價活動進行中。",
      menu: [
        { name: "紅燒牛肉麵", price: 150, popular: true },
        { name: "半筋半肉麵", price: 170, popular: true },
        { name: "酸辣湯", price: 40 },
      ],
    },
    "3": {
      name: "小美珍珠奶茶",
      cuisine: "飲品",
      rating: 4.4,
      distance: "0.2 km",
      eta: "約 3 分鐘",
      isOpen: false,
      tags: ["手搖飲", "珍珠每日現煮", "可調甜度"],
      description:
        "主打黑糖珍珠奶茶，茶香與奶香比例平衡。可自訂甜度與冰量。",
      address: "台北市中山區長安東路二段 66 號（捷運出口旁）",
      businessHours: "12:00 - 20:30",
      recentUpdate: "今日已售完，明日 12:00 準時開賣。",
      menu: [
        { name: "黑糖珍珠鮮奶", price: 65, popular: true },
        { name: "四季春青茶", price: 40 },
        { name: "冬瓜檸檬", price: 45 },
      ],
    },
  };

  if (samples[merchantId]) return samples[merchantId];

  return {
    name: "街邊風格小店",
    cuisine: "精選商家",
    rating: 4.5,
    distance: "0.8 km",
    eta: "約 10 分鐘",
    isOpen: true,
    tags: ["熱門商家", "即時通知", "現場販售"],
    description:
      "這是示範用商家頁面，正式上線後將由後端提供完整商家資訊與品項資料。",
    address: "台北市中正區示範路 1 號",
    businessHours: "11:00 - 20:00",
    recentUpdate: "今日已更新品項，歡迎訂閱通知。",
    menu: defaultMenu,
  };
};

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
  const [menuUsingFallback, setMenuUsingFallback] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  // category_id (uuid) → 中文 label。後端 menu_items.category_id 是 FK 不帶 join,
  // 所以前端要自己拉 discovery_subcategories 建 map。
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
      .catch(() => {
        // 失敗就讓 label 退回「未分類」,不影響其他功能
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const detail = useMemo(() => getMockVendorDetail(merchantId), [merchantId]);
  const routeName = useMemo(() => String(name || "").trim(), [name]);
  const routeCuisine = useMemo(() => String(cuisine || "").trim(), [cuisine]);
  const routeDescription = useMemo(
    () => String(description || "").trim(),
    [description]
  );
  const routeAddress = useMemo(() => String(address || "").trim(), [address]);
  const routeDistance = useMemo(
    () => String(distance || "").trim(),
    [distance]
  );
  const subscriptionMerchantName = useMemo(() => {
    if (!merchantId) return "";
    const matched = subs.find((item) => item.merchant_id === merchantId);
    return getMerchantDisplayName(matched);
  }, [merchantId, subs]);
  const routeIsOpen = useMemo(() => {
    const raw = String(is_open || "").trim().toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  }, [is_open]);
  const displayDetail = useMemo(
    () => ({
      ...detail,
      name: routeName || subscriptionMerchantName || detail.name,
      cuisine: routeCuisine || detail.cuisine,
      description: routeDescription || detail.description,
      address: routeAddress || detail.address,
      distance: routeDistance || detail.distance,
      isOpen: typeof routeIsOpen === "boolean" ? routeIsOpen : detail.isOpen,
    }),
    [
      detail,
      routeAddress,
      routeCuisine,
      routeDescription,
      routeDistance,
      routeIsOpen,
      routeName,
      subscriptionMerchantName,
    ]
  );

  const displayMenu = useMemo(() => {
    if (!menuUsingFallback) {
      return menuItems.map((item) => ({
        key: item.id,
        name: item.name,
        price: item.price,
        popular: item.is_popular,
        description: item.description ?? undefined,
        category: item.category_id
          ? categoryLabelMap[item.category_id] ?? "未分類"
          : "未分類",
        prepMinutes: item.prep_minutes,
      }));
    }

    return detail.menu.map((item, index) => ({
      key: `${merchantId || "mock"}-${index}-${item.name}`,
      name: item.name,
      price: item.price,
      popular: item.popular ?? false,
      description: item.description,
      category: item.category,
      prepMinutes: item.prepMinutes,
    }));
  }, [detail.menu, menuItems, menuUsingFallback, merchantId, categoryLabelMap]);

  const isSubscribed = useMemo(() => {
    if (!merchantId) return false;
    return subs.some((s) => s.merchant_id === merchantId && s.is_active);
  }, [merchantId, subs]);

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

  useEffect(() => {
    if (!merchantId) return;

    const run = async () => {
      try {
        setMenuLoading(true);
        setMenuError(null);
        const res = await menuApi.getPublicMerchantMenu(merchantId, {
          page: 1,
          page_size: 50,
        });
        setMenuItems(Array.isArray(res.data?.items) ? res.data.items : []);
        setMenuUsingFallback(false);
      } catch (e: any) {
        console.warn("load public merchant menu failed:", e);
        setMenuItems([]);
        setMenuUsingFallback(true);
        setMenuError(e?.message || "目前無法載入即時品項，先顯示示意內容。");
      } finally {
        setMenuLoading(false);
      }
    };

    run();
  }, [merchantId]);

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
      Alert.alert("訂閱成功", `已訂閱 ${displayDetail.name} 的營業通知`);
      await loadSubscriptions();
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "TOKEN_EXPIRED") {
        return;
      }
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
      Alert.alert("已取消訂閱", `你將不再收到 ${displayDetail.name} 的通知`);
      await loadSubscriptions();
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "TOKEN_EXPIRED") {
        return;
      }
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
          <PixelButton
            label="<< BACK"
            tone="ink"
            size="sm"
            display
            onPress={() => router.back()}
          />
          <PixelChip
            label={displayDetail.isOpen ? "營業中" : "休息中"}
            tone={displayDetail.isOpen ? "green" : "paper"}
            active
          />
        </View>

        <View style={{ marginTop: 10, gap: 4 }}>
          <PixelText variant="caption" tone="gold" display>
            VENDOR  PROFILE
          </PixelText>
          <PixelText variant="display">{displayDetail.name}</PixelText>
          <PixelText variant="body" tone="muted">
            {displayDetail.cuisine}
          </PixelText>
        </View>

        <View style={styles.statRow}>
          <StatBox label="評分" value={displayDetail.rating.toFixed(1)} tone="gold" />
          <StatBox label="距離" value={displayDetail.distance} tone="blue" />
          <StatBox label="到達" value={displayDetail.eta} tone="pink" />
        </View>
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
          title={isSubscribed ? "SUBSCRIBED" : "NOT  SUBSCRIBED"}
          titleTone={isSubscribed ? "green" : "ink"}
          titleDisplay
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
                {isSubscribed ? "通知已開啟" : "尚未訂閱通知"}
              </PixelText>
            </View>
            <PixelChip label="即時通知" tone="paper" active />
          </View>

          <View style={{ height: 12 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <PixelButton
                label={
                  subscriptionLoading && !isSubscribed
                    ? "..."
                    : "> 訂閱通知"
                }
                tone="green"
                fullWidth
                disabled={subscriptionLoading || isSubscribed}
                onPress={subscribe}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PixelButton
                label={
                  subscriptionLoading && isSubscribed ? "..." : "x 取消訂閱"
                }
                tone="red"
                fullWidth
                disabled={subscriptionLoading || !isSubscribed}
                onPress={unsubscribe}
              />
            </View>
          </View>
        </PixelCard>

        {/* 商家介紹 */}
        <PixelCard title="商家介紹" titleTone="blue" padding={14}>
          <PixelText variant="body">{displayDetail.description}</PixelText>
          {displayDetail.tags.length ? (
            <>
              <View style={{ height: 10 }} />
              <View style={styles.tagRow}>
                {displayDetail.tags.map((tag) => (
                  <PixelChip key={tag} label={tag} tone="purple" active />
                ))}
              </View>
            </>
          ) : null}
        </PixelCard>

        {/* 營業資訊 */}
        <PixelCard title="營業資訊" titleTone="ink" padding={14}>
          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={18}
              color={pixelColors.gold}
            />
            <PixelText variant="body" style={{ flex: 1 }}>
              {displayDetail.address}
            </PixelText>
          </View>
          <View style={{ height: 8 }} />
          <View style={styles.infoRow}>
            <Ionicons
              name="time-outline"
              size={18}
              color={pixelColors.blue}
            />
            <PixelText variant="body">{displayDetail.businessHours}</PixelText>
          </View>
        </PixelCard>

        {/* 品項 */}
        <PixelCard title="品項" titleTone="red" padding={14}>
          <View style={styles.menuHeader}>
            {menuLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <PixelLoading label="" size="sm" tone="gold" />
                <PixelText variant="caption" tone="muted">
                  載入中…
                </PixelText>
              </View>
            ) : (
              <PixelChip
                label={
                  menuUsingFallback
                    ? "示意資料"
                    : `共 ${displayMenu.length} 項`
                }
                tone="paper"
                active
              />
            )}
          </View>

          {menuError ? (
            <View style={styles.warnBox}>
              <PixelText variant="caption" tone="gold">
                {menuError}
              </PixelText>
            </View>
          ) : null}

          {!menuLoading && displayMenu.length === 0 ? (
            <View style={styles.emptyMenu}>
              <PixelText variant="body" tone="muted">
                這間商家目前尚未上架品項。
              </PixelText>
            </View>
          ) : null}

          <View style={{ gap: 8, marginTop: 10 }}>
            {displayMenu.map((item) => (
              <View key={item.key} style={styles.menuItem}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
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
                  {item.category || item.prepMinutes ? (
                    <>
                      <View style={{ height: 8 }} />
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {item.category ? (
                          <PixelChip
                            label={item.category}
                            tone="paper"
                            active
                          />
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

        {/* 最新公告 */}
        <PixelCard title="最新公告" titleTone="gold" padding={14}>
          <View style={styles.infoRow}>
            <Ionicons
              name="notifications-outline"
              size={18}
              color={pixelColors.gold}
            />
            <PixelText variant="body" style={{ flex: 1 }}>
              {displayDetail.recentUpdate}
            </PixelText>
          </View>
        </PixelCard>
      </ScrollView>
    </View>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gold" | "blue" | "pink";
}) {
  const accent =
    tone === "gold"
      ? pixelColors.gold
      : tone === "blue"
        ? pixelColors.blue
        : pixelColors.pink;
  return (
    <View style={[styles.statBox, { borderTopColor: accent }]}>
      <PixelText variant="caption" tone="muted">
        {label}
      </PixelText>
      <View style={{ height: 2 }} />
      <PixelText variant="bodyLg">{value}</PixelText>
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
  },
  hudTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
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
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: pixelColors.ink,
    borderRadius: 2,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  warnBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.gold,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  emptyMenu: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  priceBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
