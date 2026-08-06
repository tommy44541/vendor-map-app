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
    borderTopWidth: 4,
    borderTopColor: pixelColors.ink,
    borderTopLeftRadius: pixelRadius * 2,
    borderTopRightRadius: pixelRadius * 2,
    overflow: "hidden",
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
    // 更顯眼:更寬、更厚、白色高對比
    width: 64,
    height: 5,
    backgroundColor: pixelColors.gray100,
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
    borderColor: pixelColors.ink,
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
    borderColor: pixelColors.ink,
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
    borderColor: pixelColors.ink,
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    maxHeight: "80%",
  },
  modalBottomWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
