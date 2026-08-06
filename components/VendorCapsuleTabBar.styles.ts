import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // ── 膠囊（直接對應客戶端 floatingCapsule）────────────────────
  floatingCapsule: {
    position: "absolute",
    alignSelf: "center",
    borderRadius: 40,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    overflow: "hidden",
    flexDirection: "column",
  },

  // ── 拖曳把手（僅地點 tab，in-flow 排在最上方）──────────────
  capsuleTopHandle: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  capsuleTopHandleBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: pixelColors.gray500,
  },
  capsuleHeaderTitle: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  // ── 內容區（地點 tab 展開時）─────────────────────────────────
  // paddingBottom 用 insets.bottom 動態算(見 inline style),避免拉到最高時
  // 內容被下方 tab icon 蓋住 — 這裡的 80 只是 fallback。
  capsuleContent: {
    flex: 1,
    paddingBottom: 80,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 12,
  },

  // ── Tab bar（螢幕 Y 固定）────────────────────────────────────
  capsuleTabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  tabItem: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },

  // ── 地點管理 UI ───────────────────────────────────────────────
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
  locItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.surface,
    padding: 12,
  },
  locItemSelected: {
    backgroundColor: pixelColors.surfaceAlt,
    borderColor: pixelColors.gold,
  },
  locTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  // ── Modals ────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: { maxHeight: "80%" },
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
  editWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  editCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
