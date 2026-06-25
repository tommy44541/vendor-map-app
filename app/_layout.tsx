import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { pixelColors } from "../theme/pixel";
import { PixelErrorBoundary } from "../components/pixel";
import "./globals.css";

SplashScreen.preventAutoHideAsync().catch(() => {
  // 已隱藏或不可用時忽略
});

function AuthRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: pixelColors.bg },
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
  const [fontsLoaded, fontError] = useFonts({
    Cubic11: require("../assets/fonts/Cubic_11.ttf"),
    PressStart2P: require("../assets/fonts/PressStart2P-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // 前台也顯示通知（測試流程用）
  useEffect(() => {
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
      } catch (e) {
        console.warn("expo-notifications 尚未可用（可能需要重編譯 dev client）:", e);
      }
    })();
  }, []);

  if (!fontsLoaded && !fontError) {
    // 字體載入中,保持背景色避免閃白。
    return <View style={{ flex: 1, backgroundColor: pixelColors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: pixelColors.bg }}>
      <PixelErrorBoundary>
        <AuthProvider>
          <AuthRouter />
        </AuthProvider>
      </PixelErrorBoundary>
    </GestureHandlerRootView>
  );
}
