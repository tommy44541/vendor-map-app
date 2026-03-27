import AsyncStorage from "@react-native-async-storage/async-storage";

type RoleUser = {
  id: string;
  userType: "vendor" | "consumer";
};

const buildOnboardingKey = (user: RoleUser) =>
  `onboarding:completed:${user.userType}:${user.id}`;

const getHomeRoute = (user: RoleUser) =>
  user.userType === "vendor" ? "/vendor/(tabs)/home" : "/consumer/home";

const getOnboardingRoute = (user: RoleUser) =>
  user.userType === "vendor" ? "/vendor/onboarding" : "/consumer/onboarding";

export const hasCompletedOnboarding = async (user: RoleUser) => {
  try {
    return (await AsyncStorage.getItem(buildOnboardingKey(user))) === "1";
  } catch (error) {
    console.warn("read onboarding state failed:", error);
    return false;
  }
};

export const markOnboardingCompleted = async (user: RoleUser) => {
  try {
    await AsyncStorage.setItem(buildOnboardingKey(user), "1");
  } catch (error) {
    console.warn("save onboarding state failed:", error);
  }
};

export const getPostAuthRoute = async (user: RoleUser) => {
  const completed = await hasCompletedOnboarding(user);
  return completed ? getHomeRoute(user) : getOnboardingRoute(user);
};

export const getHomeRouteForUser = getHomeRoute;
