import { pixelColors } from "./pixel";

// Google Maps custom style — 配合像素 UI 的 muted dark 配色。
// 目標:讓底圖退到背景,讓 pixel marker / sheet 跳出來,同時保留
// 足夠的「我能認出這是地圖」的可讀性(街道輪廓、水體、地名要看得到)。
// 設計選擇:
//   - 底色用 pixelColors.bg(深紫藍),跟 app 整體配色一致
//   - 道路 muted gray,主要道路稍亮,讓 hierarchy 還在
//   - 隱藏多數 POI label (icon 太花),只留交通設施
//   - 水體用深藍,跟陸地有清楚對比但不刺眼
//
// 詳細 spec: https://developers.google.com/maps/documentation/javascript/style-reference
export const pixelMapStyle = [
  // 全域:地名 / icon 用 muted
  {
    elementType: "geometry",
    stylers: [{ color: pixelColors.bg }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: pixelColors.gray300 }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: pixelColors.bg }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },

  // 行政邊界 — 弱化
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: pixelColors.gray700 }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: pixelColors.gray100 }],
  },

  // POI — 大部分隱藏避免雜亂,只留公園 + 交通設施
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: pixelColors.gray700 }, { visibility: "on" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },

  // 道路 — 三階 hierarchy
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: pixelColors.gray700 }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: pixelColors.gray500 }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: pixelColors.gray700 }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: pixelColors.gray300 }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },

  // 交通 (transit) — 留車站名稱方便定位
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: pixelColors.gray700 }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },

  // 水體 — 深藍,明顯但不搶
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#1a3a5a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: pixelColors.gray500 }],
  },
];
