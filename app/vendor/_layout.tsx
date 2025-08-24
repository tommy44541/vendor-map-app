import { Stack } from "expo-router";

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="order" />
    </Stack>
  );
};

export default _layout;
