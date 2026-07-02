import ConsumerNotificationsTabButton from "@/components/ConsumerNotificationsTabButton";
import { pixelColors, pixelFont } from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ConsumerLayout = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarItemStyle: {
          width: "100%",
          height: 74,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarStyle: {
          // Phase 3 Find My 整合:隱藏 expo-router 底部 tab bar,
          // home.tsx sheet handle 內的 tab pill 取代它的角色。
          // 其他 tab 檔案保留為 stack screen 可程式 navigate,但 UI 不顯示。
          display: "none",
        },
        tabBarLabelStyle: {
          fontFamily: pixelFont.body,
          fontSize: 11,
          letterSpacing: 0.5,
          includeFontPadding: false,
          marginTop: 2,
        },
        tabBarActiveTintColor: pixelColors.gold,
        tabBarInactiveTintColor: pixelColors.gray300,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "首頁",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="location"
        options={{
          title: "地點",
          tabBarIcon: ({ color }) => (
            <Ionicons name="location" size={24} color={color} />
          ),
        }}
      />
      {/* TODO: 主動掃描附近開啟商家 */}
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarLabelStyle: {
            display: "none",
          },
          tabBarButton: (props) => <ConsumerNotificationsTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "收藏",
          tabBarIcon: ({ color }) => (
            <Ionicons name="heart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "個人",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="vendor/[id]" options={{ href: null }} />
    </Tabs>
  );
};

export default ConsumerLayout;
