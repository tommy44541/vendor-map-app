import { useRootNavigationState, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PixelBorder,
  PixelButton,
  PixelCard,
  PixelChip,
  PixelText,
} from "../components/pixel";
import { useAuth } from "../contexts/AuthContext";
import { pixelColors, pixelBorderWidth, pixelRadius } from "../theme/pixel";
import { getPostAuthRoute } from "../utils/onboarding";

type RoleKey = "vendor" | "consumer";

interface RoleCardOption {
  key: RoleKey;
  tag: string;
  title: string;
  description: string;
  callToAction: string;
  tone: "red" | "gold" | "blue";
  badge: string;
}

const ROLE_OPTIONS: RoleCardOption[] = [
  {
    key: "vendor",
    tag: "PLAYER 1",
    title: "我是商家",
    description: "管理店家、發送位置與通知,讓粉絲找得到你。",
    callToAction: "開始營業",
    tone: "red",
    badge: "VENDOR",
  },
  {
    key: "consumer",
    tag: "PLAYER 2",
    title: "我是吃貨",
    description: "追蹤喜歡的攤車,第一時間收到附近開賣通知。",
    callToAction: "開始探索",
    tone: "blue",
    badge: "EXPLORER",
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
    <Pressable onPress={onPress} style={styles.rolePressable}>
      <PixelCard title={option.badge} titleTone={option.tone} titleDisplay padding={16}>
        <View style={styles.roleHeader}>
          <PixelChip label={option.tag} tone={option.tone} active display />
          <PixelText variant="caption" tone="muted" display>
            {"PRESS  >>"}
          </PixelText>
        </View>
        <PixelText variant="title" style={styles.roleTitle}>
          {option.title}
        </PixelText>
        <PixelText variant="body" tone="muted" style={styles.roleDesc}>
          {option.description}
        </PixelText>
        <View style={styles.roleCta}>
          <PixelChip label={option.callToAction} tone="gold" active />
        </View>
      </PixelCard>
    </Pressable>
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
          <PixelText variant="bodyLg" display>
            LOADING...
          </PixelText>
          <View style={{ height: 12 }} />
          <ActivityIndicator color={pixelColors.gold} />
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
          <PixelText variant="caption" tone="muted" display>
            WELCOME BACK
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
          <ActivityIndicator color={pixelColors.gold} />
        </PixelBorder>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <View style={styles.logoText}>
            <PixelText variant="caption" tone="muted" display>
              VENDOR.MAP v.1
            </PixelText>
            <PixelText variant="display">攤位雷達</PixelText>
          </View>
        </View>
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
        <PixelText variant="bodyLg" display style={styles.selectLabel}>
          {"SELECT  PLAYER"}
        </PixelText>
        {ROLE_OPTIONS.map((opt) => (
          <RoleBlock key={opt.key} option={opt} onPress={() => handleSelect(opt.key)} />
        ))}
      </View>

      <View style={styles.footer}>
        <PixelButton
          label="START"
          tone="gold"
          size="lg"
          display
          fullWidth
          onPress={() => handleSelect("consumer")}
        />
        <View style={{ height: 8 }} />
        <PixelText variant="caption" tone="muted" display style={{ textAlign: "center" }}>
          (C) 2026 PIXEL VENDOR MAP
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
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  logoBadge: {
    width: 56,
    height: 56,
    backgroundColor: pixelColors.gold,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: {
    width: 36,
    height: 36,
  },
  logoText: {
    flex: 1,
  },
  tagline: {
    // 一條告示牌
  },
  cardsWrap: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  selectLabel: {
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 2,
  },
  rolePressable: {
    // pressable wrapper
  },
  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  roleTitle: {
    marginBottom: 4,
  },
  roleDesc: {
    marginBottom: 12,
  },
  roleCta: {
    flexDirection: "row",
  },
  footer: {
    marginTop: 12,
  },
});
