import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import "./globals.css";

// 认证路由组件
function AuthRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="vendor" options={{ headerShown: false }} />
        <Stack.Screen name="consumer" options={{ headerShown: false }} />
      </Stack.Protected>
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
