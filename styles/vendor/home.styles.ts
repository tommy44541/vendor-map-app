import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  quickCard: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surface,
    padding: 12,
    alignItems: "center",
  },
  quickCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  publishBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 10,
  },
  publishHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
