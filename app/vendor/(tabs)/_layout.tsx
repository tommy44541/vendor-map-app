import { pixelColors, pixelFont } from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VendorBroadcastTabButton from "../../../components/VendorBroadcastTabButton";

const VendorLayout = () => {
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
          backgroundColor: pixelColors.surface,
          // 動態高度 = 內容 74px + 系統 navigation bar 的 safe area
          height: 74 + insets.bottom,
          paddingBottom: insets.bottom,
          position: "absolute",
          elevation: 0,
          overflow: "visible",
          borderTopWidth: 2,
          borderTopColor: pixelColors.ink,
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
        name="menu"
        options={{
          title: "品項",
          tabBarIcon: ({ color }) => (
            <Ionicons name="restaurant" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarLabelStyle: {
            display: "none",
          },
          tabBarButton: (props) => <VendorBroadcastTabButton {...props} />,
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
      <Tabs.Screen
        name="profile"
        options={{
          title: "個人",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default VendorLayout;
