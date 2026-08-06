import { styles } from "@/styles/consumer/notifications.styles";
import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelText,
} from "@/components/pixel";
import { pixelColors } from "@/theme/pixel";
import {
  getPushNotificationLocation,
  normalizePushNotificationContent,
  type PushNotificationLocation,
  type PushNotificationContentLike,
} from "@/utils/push/notificationContent";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ReceivedItem = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  receivedAt: string;
  location: PushNotificationLocation | null;
};

const toReceivedItem = (
  content?: PushNotificationContentLike | null,
  identifier?: string,
): ReceivedItem => {
  const normalized = normalizePushNotificationContent(content);
  return {
    id:
      identifier ||
      String(Date.now()) + Math.random().toString(36).slice(2, 6),
    title: normalized.title,
    body: normalized.body,
    data: normalized.data,
    receivedAt: new Date().toISOString(),
    location: getPushNotificationLocation(content),
  };
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
  const router = useRouter();
  const [items, setItems] = useState<ReceivedItem[]>([]);
  const insets = useSafeAreaInsets();

  const focusNotificationOnMap = (item: ReceivedItem) => {
    if (!item.location) {
      Alert.alert("無法顯示位置", "這則通知沒有包含有效的攤商位置資料。");
      return;
    }

    router.replace({
      pathname: "/consumer/home",
      params: {
        focusRequest: `${Date.now()}-${item.id}`,
        focusLatitude: String(item.location.latitude),
        focusLongitude: String(item.location.longitude),
        focusTitle: item.title,
        focusLocationName: item.location.locationName || "",
        focusAddress: item.location.fullAddress || item.body,
      },
    });
  };

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  useEffect(() => {
    let receivedSub: any = null;
    let responseSub: any = null;
    let active = true;

    const addItem = (
      content?: PushNotificationContentLike | null,
      identifier?: string,
    ) => {
      if (!active) return;
      const next = toReceivedItem(content, identifier);
      setItems((prev) => {
        if (prev.some((item) => item.id === next.id)) return prev;
        return [next, ...prev].slice(0, 20);
      });
    };

    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();
        const lastRequest = lastResponse?.notification?.request;
        if (lastRequest?.content) {
          addItem(lastRequest.content, lastRequest.identifier);
        }

        receivedSub = Notifications.addNotificationReceivedListener((n) => {
          addItem(n?.request?.content, n?.request?.identifier);
        });
        responseSub = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            addItem(
              response?.notification?.request?.content,
              response?.notification?.request?.identifier,
            );
          },
        );
      } catch (e) {
        console.warn("expo-notifications not available:", e);
      }
    })();
    return () => {
      active = false;
      try {
        receivedSub?.remove?.();
        responseSub?.remove?.();
      } catch {}
    };
  }, []);

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  return (
    <View style={styles.root}>
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <PixelText variant="caption" tone="red" display>
            INBOX
          </PixelText>
          <PixelText variant="display">通知</PixelText>
          <View style={{ height: 4 }} />
          <PixelText variant="caption" tone="muted">
            顯示最近開啟或收到的推播訊息
          </PixelText>
        </View>
        <PixelButton
          label="x 清空"
          tone="red"
          size="sm"
          onPress={() => setItems([])}
          disabled={!hasItems}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
          gap: 14,
        }}
      >
        <PixelCard title="LOG" titleTone="red" titleDisplay padding={14}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color={pixelColors.ink}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText variant="bodyLg">最近收到的通知</PixelText>
              <PixelText variant="caption" tone="muted">
                點擊系統通知後也會保留在這裡
              </PixelText>
            </View>
            <PixelChip
              label={hasItems ? `${items.length} 則` : "無"}
              tone={hasItems ? "gold" : "paper"}
              active
            />
          </View>

          {!hasItems ? (
            <View style={styles.emptyBox}>
              <PixelText variant="body" tone="muted">
                目前尚未收到通知。
              </PixelText>
              <View style={{ height: 4 }} />
              <PixelText variant="caption" tone="muted">
                訂閱商家後,商家發布訊息時會在這裡列出。
              </PixelText>
            </View>
          ) : (
            <View style={{ marginTop: 12, gap: 10 }}>
              {items.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={() => focusNotificationOnMap(it)}
                  style={({ pressed }) => [
                    styles.itemBox,
                    pressed && styles.itemBoxPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${it.title}，在地圖查看位置`}
                >
                  <View style={styles.itemTitleRow}>
                    <PixelChip label="NEW" tone="red" active display />
                    <View style={{ flex: 1 }}>
                      <PixelText variant="bodyLg" numberOfLines={1}>
                        {it.title}
                      </PixelText>
                    </View>
                    <Ionicons
                      name={it.location ? "location" : "notifications"}
                      size={20}
                      color={
                        it.location ? pixelColors.red : pixelColors.gray500
                      }
                    />
                  </View>
                  <View style={{ height: 8 }} />
                  <PixelText variant="body">{it.body}</PixelText>
                  <View style={{ height: 8 }} />
                  <PixelText variant="caption" tone="muted">
                    {formatTime(it.receivedAt)}
                  </PixelText>
                </Pressable>
              ))}
            </View>
          )}
        </PixelCard>
      </ScrollView>
    </View>
  );
}
