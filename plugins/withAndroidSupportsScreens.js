const { withAndroidManifest } = require("expo/config-plugins");

// 讓 Google Play 依 <supports-screens> 判斷本 app 不支援平板 / 大螢幕裝置。
module.exports = function withAndroidSupportsScreens(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest["supports-screens"] = [
      {
        $: {
          "android:smallScreens": "true",
          "android:normalScreens": "true",
          "android:largeScreens": "false",
          "android:xlargeScreens": "false",
          "android:anyDensity": "true",
        },
      },
    ];

    return config;
  });
};
