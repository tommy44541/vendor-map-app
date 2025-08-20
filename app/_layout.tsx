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
    <Stack>
      {/* 主入口页面 - 处理认证后的路由跳转 */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* 入口页面 - 始终可用 */}
      <Stack.Screen name="entry" options={{ headerShown: false }} />

      {/* 认证页面 - 始终可用 */}
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />

      {/* 商家端页面 - 始终可用，但通过认证状态控制访问 */}
      <Stack.Screen name="vendor/home" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/profile" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/menu" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/location" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/orders" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/analytics" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/settings" options={{ headerShown: false }} />

      {/* 消费者端页面 - 始终可用，但通过认证状态控制访问 */}
      <Stack.Screen name="consumer/home" options={{ headerShown: false }} />
      <Stack.Screen name="consumer/profile" options={{ headerShown: false }} />
      <Stack.Screen
        name="consumer/favorites"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="consumer/orders" options={{ headerShown: false }} />
      <Stack.Screen name="consumer/search" options={{ headerShown: false }} />
      <Stack.Screen
        name="consumer/recommendations"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="consumer/map" options={{ headerShown: false }} />
      <Stack.Screen
        name="consumer/vendor/[id]"
        options={{ headerShown: false }}
      />

      {/* 保留原有的商家详情页面 */}
      <Stack.Screen name="merchant/[id]" options={{ headerShown: false }} />
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
