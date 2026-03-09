import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import type { Region } from "react-native-maps";

export type UnifiedMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  pinColor?: string;
};

export type UnifiedMapPressEvent = {
  latitude: number;
  longitude: number;
};

export type UnifiedMapRef = {
  animateToRegion: (region: Region, durationMs?: number) => void;
};

type Props = {
  region: Region;
  style?: any;
  markers?: UnifiedMapMarker[];
  onPress?: (e: UnifiedMapPressEvent) => void;
  onRegionChangeComplete?: (r: Region) => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
};

export const UnifiedMap = forwardRef<UnifiedMapRef, Props>(
  (
    {
      region,
      style,
      markers = [],
      onPress,
      onRegionChangeComplete,
      showsUserLocation,
      showsMyLocationButton,
    },
    ref
  ) => {
    const nativeRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (r: Region, durationMs = 800) => {
        nativeRef.current?.animateToRegion(r, durationMs);
      },
    }));

    return (
      <MapView
        ref={nativeRef}
        style={style}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={(e) => {
          const c = e?.nativeEvent?.coordinate;
          if (c?.latitude && c?.longitude && onPress) {
            onPress({ latitude: c.latitude, longitude: c.longitude });
          }
        }}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={showsMyLocationButton}
        followsUserLocation={false}
        mapType="standard"
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            description={m.description}
            pinColor={m.pinColor}
          />
        ))}
      </MapView>
    );
  }
);

UnifiedMap.displayName = "UnifiedMap";
