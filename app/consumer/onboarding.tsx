import RoleOnboardingScreen from "@/components/RoleOnboardingScreen";
import { useAuth } from "@/contexts/AuthContext";
import {
  getHomeRouteForUser,
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "@/utils/onboarding";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";

const steps = [
  {
    eyebrow: "常用地點",
    title: "先設定家與公司",
    description:
      "把常用地點先存起來，之後你才會在對的範圍內收到攤車通知。",
    icon: "home-outline" as const,
    note: "建議至少先建立 1 個主要地點，例如：家、公司、工作現場。",
  },
  {
    eyebrow: "追蹤攤車",
    title: "掃碼訂閱喜歡的攤車",
    description:
      "到首頁掃描攤商提供的 QR Code，就能開始接收對方的營業與位置通知。",
    icon: "qr-code-outline" as const,
    note: "訂閱後會自動進入收藏列表，之後可從收藏頁快速打開攤商詳情與菜單。",
  },
  {
    eyebrow: "查菜單",
    title: "從收藏查看店家資訊",
    description:
      "你可以在收藏頁找到已追蹤的攤車，查看店家頁、菜單與目前的通知狀態。",
    icon: "restaurant-outline" as const,
    note: "如果後端有回傳店名，前端會直接顯示真實名稱，不再只顯示 merchant id。",
  },
  {
    eyebrow: "通知設定",
    title: "完成後就能等通知來",
    description:
      "當攤車發布新位置或臨時營業訊息時，你會在 app 內與推播中收到提醒。",
    icon: "notifications-outline" as const,
    note: "若沒有收到提醒，可以到個人頁檢查推播權限與裝置註冊狀態。",
  },
];

export default function ConsumerOnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const guard = async () => {
      if (!user || user.userType !== "consumer") return;
      if (await hasCompletedOnboarding(user)) {
        router.replace(getHomeRouteForUser(user));
      }
    };
    guard();
  }, [router, user]);

  if (!user || user.userType !== "consumer") return null;

  return (
    <RoleOnboardingScreen
      title="消費者使用流程"
      subtitle="先把常用地點、訂閱方式與通知節奏認清楚，之後整個使用體驗會順很多。"
      steps={steps}
      colors={["#0F4C81", "#0F766E", "#164E63"]}
      accent="#0EA5E9"
      finishLabel="前往設定地點"
      onSkip={async () => {
        await markOnboardingCompleted(user);
        router.replace(getHomeRouteForUser(user));
      }}
      onFinish={async () => {
        await markOnboardingCompleted(user);
        router.replace("/consumer/location");
      }}
    />
  );
}
