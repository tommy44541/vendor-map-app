import ConsumerNotificationsTabButton from "@/components/ConsumerNotificationsTabButton";
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
          backgroundColor: "#ffffff",
          height: 74,
          position: "absolute",
          elevation: 0,
          overflow: "visible",
        },
        tabBarActiveTintColor: "#667eea",
        tabBarInactiveTintColor: "#9ca3af",
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location" size={24} color={color} />
          ),
        }}
      />
      {/* TODO: 主動掃描附近開啟攤車 */}
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "個人",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="recommendations"
        options={{
          href: null, // 隱藏tab但保持頁面可訪問
        }}
      />
      <Tabs.Screen
        name="vendor/[id]"
        options={{
          href: null, // 隱藏tab但保持頁面可訪問
        }}
      />
    </Tabs>
  );
};

export default ConsumerLayout;
