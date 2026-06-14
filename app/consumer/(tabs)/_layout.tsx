import ConsumerNotificationsTabButton from "@/components/ConsumerNotificationsTabButton";
import { pixelColors, pixelFont } from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const ConsumerLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarStyle: {
          backgroundColor: pixelColors.surface,
          height: 74,
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
