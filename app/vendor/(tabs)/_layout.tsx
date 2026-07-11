import { VendorCapsuleTabBar } from "@/components/VendorCapsuleTabBar";
import { Tabs } from "expo-router";

const VendorLayout = () => {
  return (
    <Tabs
      tabBar={(props) => <VendorCapsuleTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: "首頁" }} />
      <Tabs.Screen name="menu" options={{ title: "品項" }} />
      <Tabs.Screen name="notifications" options={{ title: "發布" }} />
      <Tabs.Screen name="location" options={{ title: "地點" }} />
      <Tabs.Screen name="profile" options={{ title: "個人" }} />
    </Tabs>
  );
};

export default VendorLayout;
