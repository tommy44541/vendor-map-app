import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { StyleSheet } from "react-native";

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
    alignItems: "center",
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
  shotWrap: {
    alignItems: "center",
  },
  qrCard: {
    backgroundColor: pixelColors.paper,
    borderWidth: pixelBorderWidth * 2,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    padding: 14,
    alignItems: "center",
  },
  qrInner: {
    backgroundColor: pixelColors.white,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    padding: 10,
  },
  qrBox: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
});
