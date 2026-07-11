import { useRootNavigationState, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PixelBorder,
  PixelButton,
  PixelCard,
  PixelChip,
  PixelLoading,
  PixelText,
} from "../components/pixel";
import { useAuth } from "../contexts/AuthContext";
import { pixelColors } from "../theme/pixel";
import { getPostAuthRoute } from "../utils/onboarding";

type RoleKey = "vendor" | "consumer";

interface RoleCardOption {
  key: RoleKey;
  title: string;
  description: string;
  callToAction: string;
  tone: "red" | "gold" | "blue";
  badge: string;
  image: ReturnType<typeof require>;
}

const ROLE_OPTIONS: RoleCardOption[] = [
  {
    key: "vendor",
    title: "我是商家",
    description: "管理店家、發送位置與通知,讓粉絲找得到你。",
    callToAction: "開始營業",
    tone: "red",
    badge: "商家",
    image: require("../assets/images/role_vendor.png"),
  },
  {
    key: "consumer",
    title: "我是吃貨",
    description: "追蹤喜歡的攤車,第一時間收到附近開賣通知。",
    callToAction: "開始探索",
    tone: "blue",
    badge: "消費者",
    image: require("../assets/images/role_consumer.png"),
  },
];

function RoleBlock({
  option,
  onPress,
}: {
  option: RoleCardOption;
  onPress: () => void;
}) {
  return (
    <View style={styles.roleWrap}>
      <PixelCard padding={20} bodyFlex style={{ flex: 1 }}>
        {/* 圖示 + badge */}
        <View style={styles.topRow}>
          <Image source={option.image} style={styles.roleIcon} resizeMode="contain" />
          <PixelChip label={option.badge} tone={option.tone} active />
        </View>

        {/* 標題 */}
        <PixelText variant="display" style={styles.roleTitle}>
          {option.title}
        </PixelText>

        {/* 說明 */}
        <PixelText variant="body" tone="muted" style={styles.roleDesc}>
          {option.description}
        </PixelText>

        <View style={{ flex: 1 }} />

        {/* CTA */}
        <PixelButton label={`> ${option.callToAction}`} tone="gold" fullWidth onPress={onPress} />
      </PixelCard>
    </View>
  );
}

export default function IndexScreen() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const rootNavState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavState?.key) return;
    if (!isLoading && isAuthenticated && user) {
      const run = async () => {
        const nextRoute = await getPostAuthRoute(user);
        router.replace(nextRoute);
      };
      run();
    }
  }, [isAuthenticated, isLoading, user, router, rootNavState?.key]);

  const handleSelect = (type: RoleKey) =>
    router.push(`/auth/register?type=${type}`);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <PixelBorder variant="double" padding={20} style={styles.loadingBox}>
          <PixelLoading label="載入中" tone="gold" />
          <View style={{ height: 8 }} />
          <PixelText variant="caption" tone="muted">
            正在讀取存檔
          </PixelText>
        </PixelBorder>
      </SafeAreaView>
    );
  }

  if (isAuthenticated && user) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <PixelBorder variant="double" padding={20} style={styles.loadingBox}>
          <PixelText variant="caption" tone="muted">
            歡迎回來
          </PixelText>
          <View style={{ height: 6 }} />
          <PixelText variant="title">
            {user.name || "玩家"}
          </PixelText>
          <View style={{ height: 12 }} />
          <PixelText variant="body" tone="muted">
            {user.userType === "vendor"
              ? "傳送到商家後台..."
              : "傳送到探索地圖..."}
          </PixelText>
          <View style={{ height: 12 }} />
          <PixelLoading label="" tone="gold" size="sm" />
        </PixelBorder>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <PixelText variant="display">攤位雷達</PixelText>
        <PixelBorder
          variant="single"
          padding={10}
          background={pixelColors.surfaceAlt}
          style={styles.tagline}
        >
          <PixelText variant="body" tone="default">
            街邊小吃 x 行動商家  -  即時通報、隨叫隨到
          </PixelText>
        </PixelBorder>
      </View>

      <View style={styles.cardsWrap}>
        <PixelText variant="bodyLg" style={styles.selectLabel}>
          選擇角色
        </PixelText>
        {ROLE_OPTIONS.map((opt) => (
          <RoleBlock key={opt.key} option={opt} onPress={() => handleSelect(opt.key)} />
        ))}
      </View>

      <View style={styles.footer}>
        <PixelText variant="caption" tone="muted" style={{ textAlign: "center" }}>
          © 2026 攤位雷達
        </PixelText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: pixelColors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingBox: {
    minWidth: 240,
    alignItems: "center",
  },
  header: {
    marginTop: 4,
    marginBottom: 12,
  },
  tagline: {
    // 一條告示牌
  },
  cardsWrap: {
    flex: 1,
    gap: 12,
  },
  selectLabel: {
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 2,
  },
  roleWrap: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  roleIcon: {
    width: 64,
    height: 64,
  },
  roleTitle: {
    marginBottom: 12,
  },
  roleDesc: {
    marginBottom: 4,
  },
  footer: {
    marginTop: 12,
  },
});
