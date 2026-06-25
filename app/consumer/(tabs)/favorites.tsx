import {
  subscriptionsApi,
  UserMerchantSubscription,
} from "@/services/api/subscriptions";
import { ApiError } from "@/services/api/util";
import { getMerchantDisplayName } from "@/utils/merchant/getMerchantDisplayName";
import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelLoading,
  PixelText,
} from "@/components/pixel";
import { pixelBorderWidth, pixelColors } from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

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
    [subs]
  );

  const unsubscribe = useCallback(
    async (merchantId: string) => {
      const mId = String(merchantId || "").trim();
      if (!mId) return;

      Alert.alert("取消訂閱", "確定要取消訂閱這個商家嗎？", [
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
    [loadSubscriptions]
  );

  const openVendorMenu = useCallback(
    (merchantId: string, merchantName?: string) => {
      const mId = String(merchantId || "").trim();
      if (!mId) {
        Alert.alert("錯誤", "缺少商家 ID");
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
    [router]
  );

  return (
    <View style={styles.root}>
      {/* HUD 標題列 */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <PixelText variant="caption" tone="pink" display>
            COLLECTION
          </PixelText>
          <PixelText variant="display">收藏</PixelText>
          <View style={{ height: 4 }} />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <PixelChip
              label={`啟用 ${activeCount}`}
              tone="green"
              active
            />
            <PixelChip label={`總計 ${subs.length}`} tone="paper" active />
          </View>
        </View>
        <PixelButton
          label={loading ? "..." : ">> 重新整理"}
          tone="pink"
          size="sm"
          onPress={loadSubscriptions}
          disabled={loading}
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
        <PixelCard title="MY  LIST" titleTone="pink" titleDisplay padding={14}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="heart" size={18} color={pixelColors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText variant="bodyLg">我的訂閱清單</PixelText>
              <PixelText variant="caption" tone="muted">
                你已訂閱的商家會列在這裡
              </PixelText>
            </View>
          </View>

          {loading && subs.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 16, gap: 8 }}>
              <PixelLoading label="" size="sm" tone="gold" />
              <PixelText variant="body" tone="muted">
                讀取中…
              </PixelText>
            </View>
          ) : subs.length === 0 ? (
            <View
              style={{
                marginTop: 14,
                padding: 12,
                borderWidth: pixelBorderWidth,
                borderColor: pixelColors.ink,
                borderRadius: 4,
                backgroundColor: pixelColors.surfaceAlt,
              }}
            >
              <PixelText variant="body">
                目前沒有訂閱。先到「首頁」掃碼或手動輸入 ID 加入第一個商家。
              </PixelText>
            </View>
          ) : (
            <View style={{ marginTop: 14, gap: 10 }}>
              {subs.map((s) => {
                const name = getMerchantDisplayName(s) || "未命名商家";
                return (
                  <View key={s.id} style={styles.itemBox}>
                    <Pressable
                      onPress={() => openVendorMenu(s.merchant_id, name)}
                      style={styles.itemHeader}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <PixelText variant="caption" tone="muted">
                          商家
                        </PixelText>
                        <PixelText variant="bodyLg">{name}</PixelText>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <PixelChip
                          label={s.is_active ? "啟用" : "停用"}
                          tone={s.is_active ? "green" : "paper"}
                          active
                        />
                        <PixelText variant="title" tone="gold" display>
                          {">"}
                        </PixelText>
                      </View>
                    </Pressable>

                    <View style={{ height: 8 }} />
                    <PixelText variant="caption" tone="muted">
                      訂閱時間 {formatTime(s.subscribed_at)}
                    </PixelText>
                    <View style={{ height: 10 }} />
                    <PixelButton
                      label={loading ? "..." : "x 取消訂閱"}
                      tone="red"
                      fullWidth
                      disabled={loading}
                      onPress={() => unsubscribe(s.merchant_id)}
                    />
                  </View>
                );
              })}
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
    backgroundColor: pixelColors.pink,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: 4,
    backgroundColor: pixelColors.surface,
    padding: 12,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
