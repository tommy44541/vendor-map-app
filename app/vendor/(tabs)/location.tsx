import { styles } from "@/styles/vendor/location.styles";
import { UnifiedMap, type UnifiedMapRef } from "@/components/maps/UnifiedMap";
import { locationMapBridge } from "@/utils/vendor/locationMapBridge";
import React, { useEffect, useRef, useState } from "react";
import { Platform, StatusBar, StyleSheet, View } from "react-native";
import type { Region } from "react-native-maps";

export default function VendorLocationScreen() {
  const mapRef = useRef<UnifiedMapRef>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 25.033,
    longitude: 121.5654,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }

    locationMapBridge.register((lat, lng) => {
      const region: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(region, 1000);
      setMapRegion(region);
    });

    return () => {
      locationMapBridge.unregister();
    };
  }, []);

  return (
    <View style={styles.root}>
      <UnifiedMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation
        showsMyLocationButton
      />
    </View>
  );
}
