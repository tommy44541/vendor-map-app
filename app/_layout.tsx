import { Stack } from "expo-router";
import LoadingScreen from "../components/LoadingScreen";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import "./globals.css";

// 认证路由组件
function AuthRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return <LoadingScreen message="正在檢查登入狀態..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 主入口页面 - 处理认证后的路由跳转 */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* 入口页面 - 始终可用 */}
      <Stack.Screen name="entry" options={{ headerShown: false }} />

      {/* 认证页面 - 始终可用 */}
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthRouter />
    </AuthProvider>
  );
}
