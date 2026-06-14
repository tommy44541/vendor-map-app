import RoleOnboardingScreen from "@/components/RoleOnboardingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { pixelColors } from "@/theme/pixel";
import {
  getHomeRouteForUser,
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "@/utils/onboarding";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";

const steps = [
  {
    eyebrow: "營業位置",
    title: "先把營業地點設好",
    description:
      "商家端最重要的是位置。先把常用營業點建立起來，之後發布通知會快很多。",
    icon: "location-outline" as const,
    note: "你可以建立多個位置，像是固定攤位、夜市點位、臨時活動現場。",
  },
  {
    eyebrow: "發布通知",
    title: "用中間按鈕快速發布",
    description:
      "底部中間按鈕就是發布通知入口，選地點、填提示訊息後就能通知追蹤者。",
    icon: "megaphone-outline" as const,
    note: "發布成功後，首頁最近活動區會保留最近 5 筆本地紀錄。",
  },
  {
    eyebrow: "品項管理",
    title: "把品項整理好",
    description:
      "品項頁可以維護上架內容，消費者之後就能從店家詳情頁看到你的商品或服務。",
    icon: "restaurant-outline" as const,
    note: "先把熱門品項、價格與準備時間填好，前台資訊會更完整。",
  },
  {
    eyebrow: "分享訂閱",
    title: "用 QR Code 讓顧客追蹤你",
    description:
      "個人頁可以開啟訂閱 QR Code，顧客掃碼後就能收藏並接收你的通知。",
    icon: "qr-code-outline" as const,
    note: "這會是商家端拉高回訪率最直接的入口，建議印出來放在攤位前。",
  },
];

export default function VendorOnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const guard = async () => {
      if (!user || user.userType !== "vendor") return;
      if (await hasCompletedOnboarding(user)) {
        router.replace(getHomeRouteForUser(user));
      }
    };
    guard();
  }, [router, user]);

  if (!user || user.userType !== "vendor") return null;

  return (
    <RoleOnboardingScreen
      title="商家端使用流程"
      subtitle="先把位置、發布、品項與 QR 流程跑順，之後這套 app 才真的能替你帶來回訪。"
      steps={steps}
      accent={pixelColors.red}
      finishLabel="前往位置設定"
      onSkip={async () => {
        await markOnboardingCompleted(user);
        router.replace(getHomeRouteForUser(user));
      }}
      onFinish={async () => {
        await markOnboardingCompleted(user);
        router.replace("/vendor/location");
      }}
    />
  );
}
