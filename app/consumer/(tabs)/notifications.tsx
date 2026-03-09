import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ReceivedItem = {
  id: string;
  title?: string;
  body?: string;
  data?: any;
  receivedAt: string;
};

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

export default function ConsumerNotificationsScreen() {
  const [items, setItems] = useState<ReceivedItem[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  // 前台接收通知（用於測試：收到時把內容顯示在這頁）
  useEffect(() => {
    let sub: any = null;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        sub = Notifications.addNotificationReceivedListener((n) => {
          const content = n?.request?.content;
          const next: ReceivedItem = {
            id: String(Date.now()),
            title: content?.title ?? undefined,
            body: content?.body ?? undefined,
            data: content?.data,
            receivedAt: new Date().toISOString(),
          };
          setItems((prev) => [next, ...prev].slice(0, 20));
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

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["left", "right", "bottom"]}>
      <LinearGradient
        colors={["#3B82F6", "#22C55E"]}
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
            <Text className="text-2xl font-extrabold text-white">通知</Text>
            <Text className="text-sm text-white/85 mt-1">
              僅顯示最近收到的通知（App 在前台時）。
            </Text>
          </View>
          <Pressable
            onPress={() => setItems([])}
            className="w-10 h-10 rounded-2xl items-center justify-center bg-white/25"
          >
            <Ionicons name="trash" size={18} color="#fff" />
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
              <Ionicons name="chatbubble-ellipses" size={18} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">最近收到的通知</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                目前僅展示前台接收（方便測試）；後台通知請看系統通知中心
              </Text>
            </View>
          </View>

          {!hasItems ? (
            <View className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <Text className="text-sm text-gray-700">目前尚未收到通知。</Text>
            </View>
          ) : (
            <View className="mt-4 gap-3">
              {items.map((it) => (
                <View
                  key={it.id}
                  className="border border-gray-200 rounded-2xl p-4 bg-white"
                >
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                    {it.title || "(無標題)"}
                  </Text>
                  {it.body ? (
                    <Text className="text-sm text-gray-700 mt-2 leading-5">
                      {it.body}
                    </Text>
                  ) : null}
                  <Text className="text-xs text-gray-500 mt-3">
                    {formatTime(it.receivedAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
