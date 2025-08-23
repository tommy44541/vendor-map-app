import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";
import { useAuth } from "../contexts/AuthContext";

export default function IndexScreen() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // 已认证用户，根据用户类型跳转
        if (user.userType === "vendor") {
          router.replace("/vendor/(tabs)/home");
        } else {
          router.replace("/consumer/home");
        }
      } else {
        // 未认证用户，跳转到入口页面
        router.replace("/entry");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // 显示加载状态
  if (isLoading) {
    return <LoadingScreen message="正在檢查登入狀態..." />;
  }

  // 这个组件实际上不会渲染任何内容，因为会立即跳转
  return null;
}
