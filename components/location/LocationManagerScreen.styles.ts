import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: pixelColors.surface,
    borderTopWidth: 1,
    borderTopColor: pixelColors.borderSoft,
    borderTopLeftRadius: pixelRadius * 2,
    borderTopRightRadius: pixelRadius * 2,
    overflow: "hidden",
    shadowColor: pixelColors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  handleWrap: {
    // 加大 hit area,讓拇指容易抓
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  pulseLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  handle: {
    width: 64,
    height: 5,
    backgroundColor: pixelColors.gray500,
    borderRadius: 2,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  addressBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 10,
  },
  savedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  emptyBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    padding: 14,
    alignItems: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surface,
    padding: 12,
  },
  listItemSelected: {
    backgroundColor: pixelColors.surfaceAlt,
    borderColor: pixelColors.gold,
  },
  listItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  listItemActions: {
    gap: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(24,31,26,0.48)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    maxHeight: "80%",
  },
  modalBottomWrap: {
    flex: 1,
    backgroundColor: "rgba(24,31,26,0.48)",
    justifyContent: "flex-end",
  },
  modalBottomCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.borderSoft,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
