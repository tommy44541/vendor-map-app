const androidGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = () => ({
  name: "vendor_map_app",
  slug: "vendor_map_app",
  version: "1.0.6",
  orientation: "portrait",
  icon: "./assets/images/logo.png",
  scheme: "vendormapapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.tomslighter.vendormapapp",
    infoPlist: {
      UIBackgroundModes: ["location", "fetch", "remote-notification"],
      NSCameraUsageDescription: "需要相機權限以掃描攤商訂閱 QR Code。",
      NSLocationWhenInUseUsageDescription:
        "This app requires access to your location when open.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "This app requires access to your location even when closed.",
      NSLocationAlwaysUsageDescription:
        "This app requires access to your location when open.",
      deploymentTarget: "14",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/logo.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    package: "com.tomslighter.vendormapapp",
    config: androidGoogleMapsApiKey
      ? {
          googleMaps: {
            apiKey: androidGoogleMapsApiKey,
          },
        }
      : undefined,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/logo.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/logo.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme:
          "com.googleusercontent.apps.193475500949-r14b0gln2vp6so5pkdcbda18c95a17pc",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      // env 優先,沒設時 fallback 到 hardcoded(本機 eas build 不需設 env 也能跑)。
      projectId:
        process.env.EXPO_PROJECT_ID || "a089b518-9863-44a6-b959-14041e7a00ec",
    },
  },
});
