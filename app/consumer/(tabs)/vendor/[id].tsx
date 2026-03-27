import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { menuApi, MenuItem } from "@/services/api/menu";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  subscriptionsApi,
  UserMerchantSubscription,
} from "@/services/api/subscriptions";
import { ApiError } from "@/services/api/util";
import { getMerchantDisplayName } from "@/utils/merchant/getMerchantDisplayName";
import { getFcmTokenOrNull, getStableDeviceId } from "@/utils/push";

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
  { name: "招牌炒麵", price: 85, popular: true, category: "主食", prepMinutes: 8 },
  { name: "蒜香雞腿飯", price: 110, popular: true, category: "主食", prepMinutes: 10 },
  { name: "古早味紅茶", price: 35, category: "飲品", prepMinutes: 2 },
  { name: "椒鹽雞米花", price: 70, category: "小點", prepMinutes: 6 },
];

const categoryLabels: Record<MenuItem["category"], string> = {
  main: "主食",
  snack: "小點",
  drink: "飲品",
  dessert: "甜點",
};

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
    name: "街邊美食攤車",
    cuisine: "綜合料理",
    rating: 4.5,
    distance: "0.8 km",
    eta: "約 10 分鐘",
    isOpen: true,
    tags: ["熱門攤車", "即時通知", "現點現做"],
    description:
      "這是示範用攤商頁面，正式上線後將由後端提供完整攤商資訊與菜單資料。",
    address: "台北市中正區示範路 1 號",
    businessHours: "11:00 - 20:00",
    recentUpdate: "今日已更新菜單，歡迎訂閱通知。",
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
  const { id, name, cuisine, is_open } = useLocalSearchParams<{
    id?: string;
    name?: string;
    cuisine?: string;
    is_open?: string;
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

  const detail = useMemo(() => getMockVendorDetail(merchantId), [merchantId]);
  const routeName = useMemo(() => String(name || "").trim(), [name]);
  const routeCuisine = useMemo(() => String(cuisine || "").trim(), [cuisine]);
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
      isOpen: typeof routeIsOpen === "boolean" ? routeIsOpen : detail.isOpen,
    }),
    [detail, routeCuisine, routeIsOpen, routeName, subscriptionMerchantName]
  );

  const displayMenu = useMemo(() => {
    if (!menuUsingFallback) {
      return menuItems.map((item) => ({
        key: item.id,
        name: item.name,
        price: item.price,
        popular: item.is_popular,
        description: item.description ?? undefined,
        category: categoryLabels[item.category],
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
  }, [detail.menu, menuItems, menuUsingFallback, merchantId]);

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
        setMenuError(e?.message || "目前無法載入即時菜單，先顯示示意內容。");
      } finally {
        setMenuLoading(false);
      }
    };

    run();
  }, [merchantId]);

  const subscribe = async () => {
    if (!merchantId) {
      Alert.alert("錯誤", "缺少攤商 ID");
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
        Alert.alert("登入已過期", "請重新登入後再試");
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
        Alert.alert("登入已過期", "請重新登入後再試");
        return;
      }
      Alert.alert("錯誤", e?.message || "取消訂閱失敗");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["left", "right", "bottom"]}>
      <LinearGradient
        colors={["#0EA5E9", "#0284C7", "#0369A1"]}
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 18,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>

          <View className="bg-white/20 rounded-full px-3 py-1.5">
            <Text className="text-white text-xs font-semibold">
              {displayDetail.isOpen ? "營業中" : "休息中"}
            </Text>
          </View>
        </View>

        <View className="mt-4">
          <Text className="text-white text-[30px] leading-[34px] font-extrabold">
            {displayDetail.name}
          </Text>
          <Text className="text-white/85 text-sm mt-2">{displayDetail.cuisine}</Text>
        </View>

        <View className="mt-4 flex-row gap-2">
          <View className="flex-1 rounded-2xl bg-white/20 px-3 py-2.5">
            <Text className="text-white/80 text-[11px]">評分</Text>
              <Text className="text-white text-base font-bold mt-0.5">
              {displayDetail.rating.toFixed(1)}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/20 px-3 py-2.5">
              <Text className="text-white/80 text-[11px]">距離</Text>
              <Text className="text-white text-base font-bold mt-0.5">{displayDetail.distance}</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/20 px-3 py-2.5">
              <Text className="text-white/80 text-[11px]">到達時間</Text>
              <Text className="text-white text-base font-bold mt-0.5">{displayDetail.eta}</Text>
            </View>
          </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 120 }}
      >
        <View className="px-4">
          <View className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View
                  className={`w-2.5 h-2.5 rounded-full ${
                    isSubscribed ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                <Text className="text-sm font-semibold text-slate-800">
                  {isSubscribed ? "已訂閱通知" : "尚未訂閱"}
                </Text>
              </View>
              <Text className="text-xs text-slate-500">即時營業通知</Text>
            </View>

            <View className="flex-row gap-2 mt-3">
              <Pressable
                onPress={subscribe}
                disabled={subscriptionLoading || isSubscribed}
                className={`flex-1 rounded-xl py-3 items-center ${
                  subscriptionLoading || isSubscribed ? "bg-slate-200" : "bg-emerald-600"
                }`}
              >
                {subscriptionLoading && !isSubscribed ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">訂閱通知</Text>
                )}
              </Pressable>
              <Pressable
                onPress={unsubscribe}
                disabled={subscriptionLoading || !isSubscribed}
                className={`flex-1 rounded-xl py-3 items-center ${
                  subscriptionLoading || !isSubscribed ? "bg-slate-200" : "bg-rose-600"
                }`}
              >
                {subscriptionLoading && isSubscribed ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">取消訂閱</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View className="px-4 mt-4 gap-3">
          <View className="bg-white border border-slate-200 rounded-2xl p-4">
            <Text className="text-base font-bold text-slate-900">攤商介紹</Text>
            <Text className="text-sm text-slate-600 leading-6 mt-2">{displayDetail.description}</Text>
            <View className="flex-row flex-wrap gap-2 mt-3">
              {displayDetail.tags.map((tag) => (
                <View key={tag} className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-100">
                  <Text className="text-[11px] font-semibold text-sky-700">{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="bg-white border border-slate-200 rounded-2xl p-4">
            <Text className="text-base font-bold text-slate-900">營業資訊</Text>
            <View className="mt-3 gap-2.5">
              <View className="flex-row items-start">
                <Ionicons name="location-outline" size={18} color="#334155" />
                <Text className="text-sm text-slate-600 ml-2 flex-1 leading-5">
                  {displayDetail.address}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={18} color="#334155" />
                <Text className="text-sm text-slate-600 ml-2">{displayDetail.businessHours}</Text>
              </View>
            </View>
          </View>

          <View className="bg-white border border-slate-200 rounded-2xl p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-slate-900">菜單</Text>
              {menuLoading ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Text className="text-xs text-slate-500">
                  {menuUsingFallback ? "示意資料" : `共 ${displayMenu.length} 項`}
                </Text>
              )}
            </View>

            {menuError ? (
              <View className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                <Text className="text-[12px] leading-5 text-amber-800">{menuError}</Text>
              </View>
            ) : null}

            <View className="mt-3 gap-2">
              {!menuLoading && displayMenu.length === 0 ? (
                <View className="rounded-xl border border-dashed border-slate-300 px-4 py-5">
                  <Text className="text-sm text-slate-500 text-center">
                    這間攤商目前尚未上架菜單。
                  </Text>
                </View>
              ) : null}

              {displayMenu.map((item) => (
                <View
                  key={item.key}
                  className="rounded-xl border border-slate-200 px-3.5 py-3"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-semibold text-slate-800">
                          {item.name}
                        </Text>
                        {item.popular ? (
                          <View className="px-2 py-0.5 rounded-full bg-rose-100">
                            <Text className="text-[10px] font-semibold text-rose-700">
                              HOT
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {item.description ? (
                        <Text className="text-xs text-slate-500 leading-5 mt-1">
                          {item.description}
                        </Text>
                      ) : null}
                      {item.category || item.prepMinutes ? (
                        <View className="flex-row items-center gap-2 mt-2">
                          {item.category ? (
                            <View className="px-2.5 py-1 rounded-full bg-slate-100">
                              <Text className="text-[10px] font-semibold text-slate-600">
                                {item.category}
                              </Text>
                            </View>
                          ) : null}
                          {typeof item.prepMinutes === "number" ? (
                            <Text className="text-[11px] text-slate-500">
                              約 {item.prepMinutes} 分鐘
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>

                    <Text className="text-sm font-bold text-slate-900">
                      ${item.price}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <View className="flex-row items-start">
              <Ionicons name="notifications-outline" size={18} color="#B45309" />
              <View className="ml-2 flex-1">
                <Text className="text-sm font-semibold text-amber-800">最新公告</Text>
                <Text className="text-sm text-amber-700 leading-6 mt-1">
                  {displayDetail.recentUpdate}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
