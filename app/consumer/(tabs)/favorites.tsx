import {
  subscriptionsApi,
  UserMerchantSubscription,
} from "@/services/api/subscriptions";
import { ApiError } from "@/services/api/util";
import { getMerchantDisplayName } from "@/utils/merchant/getMerchantDisplayName";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const cls =
    tone === "success"
      ? "bg-green-100"
      : tone === "danger"
        ? "bg-rose-100"
        : "bg-gray-100";
  const textCls =
    tone === "success"
      ? "text-green-700"
      : tone === "danger"
        ? "text-rose-700"
        : "text-gray-700";
  return (
    <View className={`${cls} px-2.5 py-1 rounded-full`}>
      <Text className={`text-xs font-semibold ${textCls}`}>{label}</Text>
    </View>
  );
}

export default function ConsumerFavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<UserMerchantSubscription[]>([]);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subscriptionsApi.getSubscriptions();
      setSubs(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      Alert.alert("錯誤", e?.message || "取得訂閱列表失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const activeCount = useMemo(
    () => subs.filter((s) => s.is_active).length,
    [subs],
  );

  const unsubscribe = useCallback(
    async (merchantId: string) => {
      const mId = String(merchantId || "").trim();
      if (!mId) return;

      Alert.alert("取消訂閱", "確定要取消訂閱這個攤商嗎？", [
        { text: "取消", style: "cancel" },
        {
          text: "取消訂閱",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await subscriptionsApi.unsubscribeMerchant(mId);
              await loadSubscriptions();
            } catch (e: any) {
              if (e instanceof ApiError && e.code === "TOKEN_EXPIRED") {
                Alert.alert("登入已過期", "請重新登入後再試");
                return;
              }
              Alert.alert("錯誤", e?.message || "取消訂閱失敗");
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    },
    [loadSubscriptions],
  );

  const openVendorMenu = useCallback(
    (merchantId: string, merchantName?: string) => {
      const mId = String(merchantId || "").trim();
      if (!mId) {
        Alert.alert("錯誤", "缺少攤商 ID");
        return;
      }
      router.push({
        pathname: "/consumer/vendor/[id]",
        params: {
          id: mId,
          ...(merchantName?.trim() ? { name: merchantName.trim() } : {}),
        },
      });
    },
    [router],
  );

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      edges={["left", "right", "bottom"]}
    >
      <LinearGradient
        colors={["#EC4899", "#F97316"]}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 18,
          paddingHorizontal: 16,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-extrabold text-white">收藏</Text>
            <Text className="text-sm text-white/85 mt-1">
              我的訂閱（啟用中：{activeCount} / 共 {subs.length}）
            </Text>
          </View>
          <Pressable
            onPress={loadSubscriptions}
            disabled={loading}
            className="w-10 h-10 rounded-2xl items-center justify-center bg-white/25"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="refresh" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, gap: 14 }}
      >
        <View className="bg-white border border-gray-200 rounded-3xl p-4">
          <View className="flex-row items-center gap-2">
            <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
              <Ionicons name="heart" size={18} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                我的訂閱
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                你已訂閱的攤商會出現在這裡
              </Text>
            </View>
          </View>

          {subs.length === 0 ? (
            <View className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <Text className="text-sm text-gray-700">
                目前沒有訂閱。請到「首頁」使用掃碼訂閱攤商。
              </Text>
            </View>
          ) : (
            <View className="mt-4 gap-3">
              {subs.map((s) => (
                <View
                  key={s.id}
                  className="border border-gray-200 rounded-2xl p-4 bg-white"
                >
                  <Pressable
                    onPress={() =>
                      openVendorMenu(s.merchant_id, getMerchantDisplayName(s))
                    }
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-semibold text-gray-900">
                        攤商：{getMerchantDisplayName(s) || "未命名攤商"}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Badge
                        label={s.is_active ? "啟用" : "停用"}
                        tone={s.is_active ? "success" : "neutral"}
                      />
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#6B7280"
                      />
                    </View>
                  </Pressable>
                  <Text className="text-xs text-gray-500 mt-2">
                    訂閱時間：{formatTime(s.subscribed_at)}
                  </Text>
                  <Pressable
                    onPress={() => unsubscribe(s.merchant_id)}
                    disabled={loading}
                    className={`mt-3 rounded-2xl py-2 items-center ${
                      loading ? "bg-gray-200" : "bg-rose-600"
                    }`}
                  >
                    <Text className="text-white font-semibold">取消訂閱</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
