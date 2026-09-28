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
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  brandCopy: {
    flex: 1,
  },
  tagline: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: pixelColors.borderSoft,
  },
  cardsWrap: {
    flex: 1,
    gap: 12,
  },
  selectLabel: {
    textAlign: "center",
    marginBottom: 4,
    fontWeight: "600",
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
  roleIconWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: pixelColors.surfaceAlt,
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
