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
          height: 70,
          position: "absolute",
          elevation: 0,
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
        name="menu"
        options={{
          title: "菜單",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={24} color={color} />
          ),
        }}
      />
      {/* TODO: 主動掃描附近開啟攤車 */}
      {/* <Tabs.Screen
        name="notifications"
        options={{
          tabBarLabelStyle: {
            display: "none",
          },
          tabBarButton: () => (
            <TouchableOpacity
              onPress={() => alert("發送營業通知?")}
              className="bottom-4"
            >
              <View className="w-20 h-20 rounded-full bg-[#FF6B6B] flex items-center justify-center p-0">
                <Octicons name="broadcast" size={40} color="white" />
              </View>
            </TouchableOpacity>
          ),
        }}
      /> */}
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
        name="orders"
        options={{
          title: "訂單",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={24} color={color} />
          ),
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
