import { Stack } from "expo-router";
import { pixelColors } from "@/theme/pixel";

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: pixelColors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
};

export default _layout;
