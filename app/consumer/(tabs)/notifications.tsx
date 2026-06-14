import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelText,
} from "@/components/pixel";
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    <View style={styles.root}>
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <PixelText variant="caption" tone="red" display>
            INBOX
          </PixelText>
          <PixelText variant="display">通知</PixelText>
          <View style={{ height: 4 }} />
          <PixelText variant="caption" tone="muted">
            僅顯示 App 在前台時收到的訊息
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
                後台通知請看系統通知中心
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
                <View key={it.id} style={styles.itemBox}>
                  <View style={styles.itemTitleRow}>
                    <PixelChip label="NEW" tone="red" active display />
                    <View style={{ flex: 1 }}>
                      <PixelText variant="bodyLg" numberOfLines={1}>
                        {it.title || "(無標題)"}
                      </PixelText>
                    </View>
                  </View>
                  {it.body ? (
                    <>
                      <View style={{ height: 8 }} />
                      <PixelText variant="body">{it.body}</PixelText>
                    </>
                  ) : null}
                  <View style={{ height: 8 }} />
                  <PixelText variant="caption" tone="muted">
                    {formatTime(it.receivedAt)}
                  </PixelText>
                </View>
              ))}
            </View>
          )}
        </PixelCard>
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    backgroundColor: pixelColors.red,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    marginTop: 12,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 12,
  },
  itemBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surface,
    padding: 12,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
