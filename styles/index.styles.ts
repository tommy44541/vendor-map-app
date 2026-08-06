import { pixelColors } from "@/theme/pixel";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: pixelColors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingBox: {
    minWidth: 240,
    alignItems: "center",
  },
  header: {
    marginTop: 4,
    marginBottom: 12,
  },
  tagline: {
    // 一條告示牌
  },
  cardsWrap: {
    flex: 1,
    gap: 12,
  },
  selectLabel: {
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 2,
  },
  roleWrap: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  roleIcon: {
    width: 64,
    height: 64,
  },
  roleTitle: {
    marginBottom: 12,
  },
  roleDesc: {
    marginBottom: 4,
  },
  footer: {
    marginTop: 12,
  },
});
