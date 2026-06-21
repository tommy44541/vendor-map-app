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
  Modal,
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
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("登出失敗:", error);
    }
  };

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
      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.hudUser} onPress={() => setShowUserMenu(true)}>
          <View style={styles.avatar}>
            <PixelText variant="bodyLg" display tone="inverse">
              {(user?.name?.charAt(0) || "V").toUpperCase()}
            </PixelText>
          </View>
          <View style={{ flex: 1 }}>
            <PixelText variant="caption" tone="red" display>
              PLAYER 1
            </PixelText>
            <PixelText variant="bodyLg">{user?.name || "商家"}</PixelText>
          </View>
          <PixelChip label="MENU" tone="paper" active display />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 110,
          gap: 16,
        }}
      >
        {/* 快速功能 */}
        <View>
          <View style={styles.sectionHeader}>
            <View>
              <PixelText variant="caption" tone="gold" display>
                QUICK ACCESS
              </PixelText>
              <PixelText variant="title">快速功能</PixelText>
            </View>
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
            <View>
              <PixelText variant="caption" tone="pink" display>
                BROADCAST LOG
              </PixelText>
              <PixelText variant="title">最近活動</PixelText>
            </View>
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
              <PixelCard
                title="VENDOR  MENU"
                titleTone="red"
                titleDisplay
                padding={0}
              >
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
                        {(user?.name?.charAt(0) || "V").toUpperCase()}
                      </PixelText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <PixelText variant="bodyLg">
                        {user?.name || "商家"}
                      </PixelText>
                      <PixelText variant="caption" tone="muted">
                        {user?.email || "未取得"}
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
                    router.push("/vendor/profile");
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

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "red" | "gold" | "blue";
}) {
  const accent = toneToColor(tone);
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
  hud: {
    backgroundColor: pixelColors.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
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
    backgroundColor: pixelColors.red,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  statRow: {
    flexDirection: "row",
    gap: 8,
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
