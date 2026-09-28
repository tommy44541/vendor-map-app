/**
 * Light cartographic style that keeps streets readable while allowing vendor
 * markers and the floating capsule to remain the strongest visual signals.
 */
export const fieldMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#E7EAE3" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#59635B" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#F7F7F2" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ saturation: -70 }, { lightness: 12 }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#C7CDC3" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#E3E7DF" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#D8E2D4" }],
  },
  {
    featureType: "poi.business",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#F8F7F1" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#D9DDD5" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#EFEDE4" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#DCCEA9" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#C8B98F" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#DDE1DA" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#C8D8D7" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#57747D" }],
  },
];

// Keep the old export while screens are migrated to semantic names.
export const pixelMapStyle = fieldMapStyle;
