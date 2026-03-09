import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import VendorBroadcastTabButton from "../../../components/VendorBroadcastTabButton";

const VendorLayout = () => {
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
        tabBarActiveTintColor: "#FF6B6B",
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
        name="menu"
        options={{
          title: "菜單",
          tabBarIcon: ({ color, size }) => (
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location" size={24} color={color} />
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
        name="analytics"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default VendorLayout;
