import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelText,
} from "@/components/pixel";
import type { PublishLocationNotificationData } from "@/services/api/notification";
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import {
  clearRecentPublishedResult,
  getRecentPublishedResults,
} from "@/utils/vendor/recentPublish";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useAuth } from "../../../contexts/AuthContext";

type QuickItem = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "red" | "blue" | "gold" | "green";
  onPress: () => void;
};

export default function VendorHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [recentPublishes, setRecentPublishes] = useState<
    PublishLocationNotificationData[]
  >([]);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const formatPublishTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const loadRecentPublish = useCallback(async () => {
    const cached = await getRecentPublishedResults();
    setRecentPublishes(cached);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentPublish();
    }, [loadRecentPublish]),
  );

  const handleClearRecentPublish = () => {
    Alert.alert("清除送出紀錄", "要清除此區塊顯示的本地紀錄(最多 5 筆)嗎?", [
      { text: "取消", style: "cancel" },
      {
        text: "清除",
        style: "destructive",
        onPress: async () => {
          await clearRecentPublishedResult();
          setRecentPublishes([]);
        },
      },
    ]);
  };

  const quickItems: QuickItem[] = [
    {
      id: "profile",
      title: "個人資料",
      icon: "person",
      tone: "red",
      onPress: () => router.push("/vendor/profile"),
    },
    {
      id: "menu",
      title: "品項管理",
      icon: "restaurant",
      tone: "blue",
      onPress: () => router.push("/vendor/menu"),
    },
    {
      id: "location",
      title: "位置設定",
      icon: "location",
      tone: "gold",
      onPress: () => router.push("/vendor/location"),
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 120,
          gap: 16,
        }}
      >
        {/* 快速功能 */}
        <View>
          <View style={styles.sectionHeader}>
            <PixelText variant="title">快速功能</PixelText>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {quickItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={item.onPress}
                style={{ flex: 1 }}
              >
                <View style={styles.quickCard}>
                  <View
                    style={[
                      styles.quickIcon,
                      { backgroundColor: toneToColor(item.tone) },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={pixelColors.ink}
                    />
                  </View>
                  <View style={{ height: 8 }} />
                  <PixelText variant="bodyLg" style={{ textAlign: "center" }}>
                    {item.title}
                  </PixelText>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 最近活動 */}
        <View>
          <View style={styles.sectionHeader}>
            <PixelText variant="title">最近活動</PixelText>
            <PixelButton
              label="x 清除"
              tone={recentPublishes.length > 0 ? "red" : "paper"}
              size="sm"
              disabled={recentPublishes.length === 0}
              onPress={handleClearRecentPublish}
            />
          </View>

          <PixelCard padding={14}>
            {recentPublishes.length === 0 ? (
              <View style={{ alignItems: "flex-start", gap: 6 }}>
                <PixelText variant="bodyLg">尚無發布紀錄</PixelText>
                <PixelText variant="body" tone="muted">
                  到「發布通知」tab 發出第一則營業訊息,這裡會列出最近 5 筆。
                </PixelText>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {recentPublishes.map((item, index) => (
                  <View key={item.ID} style={styles.publishBox}>
                    <View style={styles.publishHead}>
                      <PixelChip
                        label={`#${index + 1}`}
                        tone="gold"
                        active
                        display
                      />
                      <PixelText variant="caption" tone="muted">
                        {formatPublishTime(item.PublishedAt)}
                      </PixelText>
                    </View>
                    <View style={{ height: 6 }} />
                    <PixelText variant="body">
                      地點 {item.LocationName}
                    </PixelText>
                    <View style={{ height: 2 }} />
                    <PixelText variant="body" tone="muted">
                      訊息 {item.HintMessage}
                    </PixelText>
                    <View style={{ height: 8 }} />
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <PixelChip
                        label={`成功 ${item.TotalSent}`}
                        tone="green"
                        active
                      />
                      <PixelChip
                        label={`失敗 ${item.TotalFailed}`}
                        tone={item.TotalFailed > 0 ? "red" : "paper"}
                        active
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </PixelCard>
        </View>
      </ScrollView>
    </View>
  );
}

function toneToColor(tone: "red" | "gold" | "blue" | "green") {
  switch (tone) {
    case "red":
      return pixelColors.red;
    case "gold":
      return pixelColors.gold;
    case "blue":
      return pixelColors.blue;
    case "green":
      return pixelColors.green;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  quickCard: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surface,
    padding: 12,
    alignItems: "center",
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  publishBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 10,
  },
  publishHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
