import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ApiError } from "@/services/api/util";
import {
  subscriptionsApi,
  UserMerchantSubscription,
} from "@/services/api/subscriptions";
import { getStableDeviceId, getFcmTokenOrNull } from "@/utils/push";

const Vendor = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const merchantId = useMemo(() => String(id || "").trim(), [id]);

  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<UserMerchantSubscription[]>([]);

  const isSubscribed = useMemo(() => {
    if (!merchantId) return false;
    return subs.some((s) => s.merchant_id === merchantId && s.is_active);
  }, [merchantId, subs]);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await subscriptionsApi.getSubscriptions();
      setSubs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn("load subscriptions failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [merchantId]);

  const buildDeviceInfo = async () => {
    const [deviceId, fcmToken] = await Promise.all([
      getStableDeviceId(),
      getFcmTokenOrNull(),
    ]);
    // device_info 在後端是 optional；取不到就不帶
    if (!deviceId || !fcmToken) return undefined;
    return { device_id: deviceId, fcm_token: fcmToken, platform: Platform.OS };
  };

  const subscribe = async () => {
    if (!merchantId) {
      Alert.alert("錯誤", "缺少 merchantId（路由參數）");
      return;
    }
    try {
      setLoading(true);
      const deviceInfo = await buildDeviceInfo();
      await subscriptionsApi.subscribeMerchant({
        merchant_id: merchantId,
        device_info: deviceInfo,
      });
      Alert.alert("成功", "已訂閱此攤商");
      await loadSubscriptions();
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "TOKEN_EXPIRED") {
        Alert.alert("登入已過期", "請重新登入後再試");
        return;
      }
      Alert.alert("錯誤", e?.message || "訂閱失敗");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!merchantId) return;
    try {
      setLoading(true);
      await subscriptionsApi.unsubscribeMerchant(merchantId);
      Alert.alert("成功", "已取消訂閱");
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
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text className="text-xl font-bold text-gray-900">攤商詳情（測試版）</Text>

      <View className="bg-white border border-gray-200 rounded-2xl p-4">
        <Text className="text-sm text-gray-600">merchant_id</Text>
        <Text selectable className="text-base text-gray-900 mt-1">
          {merchantId || "(空)"}
        </Text>
      </View>

      <View className="bg-white border border-gray-200 rounded-2xl p-4">
        <Text className="text-sm font-semibold text-gray-800 mb-2">
          訂閱狀態
        </Text>
        <Text className="text-base text-gray-900">
          {isSubscribed ? "已訂閱（active）" : "未訂閱"}
        </Text>

        <View className="mt-4 flex-row gap-10">
          <Pressable
            onPress={subscribe}
            disabled={loading || isSubscribed}
            className={`flex-1 rounded-xl py-3 items-center ${
              loading || isSubscribed ? "bg-gray-300" : "bg-blue-600"
            }`}
          >
            {loading && !isSubscribed ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">訂閱</Text>
            )}
          </Pressable>

          <Pressable
            onPress={unsubscribe}
            disabled={loading || !isSubscribed}
            className={`flex-1 rounded-xl py-3 items-center ${
              loading || !isSubscribed ? "bg-gray-300" : "bg-red-600"
            }`}
          >
            {loading && isSubscribed ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">取消訂閱</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View className="bg-white border border-gray-200 rounded-2xl p-4">
        <Text className="text-sm font-semibold text-gray-800 mb-2">
          訂閱列表（你目前帳號）
        </Text>
        <Pressable
          onPress={loadSubscriptions}
          disabled={loading}
          className="self-start bg-gray-200 px-3 py-2 rounded-lg"
        >
          <Text className="text-xs font-semibold text-gray-800">刷新</Text>
        </Pressable>
        <Text selectable className="text-xs text-gray-700 mt-3">
          {JSON.stringify(subs, null, 2)}
        </Text>
      </View>
    </ScrollView>
  );
};

export default Vendor;
