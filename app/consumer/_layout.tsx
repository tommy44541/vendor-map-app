import { Stack } from "expo-router";

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="map" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="recommendations" />
    </Stack>
  );
};

export default _layout;
