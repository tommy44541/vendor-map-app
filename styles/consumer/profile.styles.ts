import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  hud: {
    backgroundColor: pixelColors.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: pixelBorderWidth,
    borderBottomColor: pixelColors.ink,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    backgroundColor: pixelColors.gold,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconAlt: {
    width: 36,
    height: 36,
    backgroundColor: pixelColors.purple,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  // 2px 黑線分區,取代雙層 inset box
  divider: {
    height: 2,
    backgroundColor: pixelColors.ink,
    marginVertical: 12,
  },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  // 裝置卡仍保留,因為每張卡有自己的 action buttons,需要視覺邊界
  deviceBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 12,
  },
  monoText: {
    color: pixelColors.white,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  monoRight: {
    flex: 1,
    marginLeft: 8,
    marginTop: 0,
    textAlign: "right",
  },
});
