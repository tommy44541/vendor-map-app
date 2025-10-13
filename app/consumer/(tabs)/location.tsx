import * as Location from "expo-location";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useAuth } from "../../../contexts/AuthContext";
import {
  consumerApi,
  CreateUserLocationRequest,
} from "../../../services/api/consumer";

const LocationPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 25.033, // 台北市默认坐标
    longitude: 121.5654,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const { user, logout } = useAuth();
  const mapRef = useRef<MapView>(null);

  // 获取当前位置
  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);

      // 请求位置权限
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("权限被拒绝", "需要位置权限才能获取当前位置");
        return;
      }

      // 获取当前位置
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // 反向地理编码获取地址
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const fullAddress = address[0]
        ? `${address[0].street || ""} ${address[0].streetNumber || ""}, ${
            address[0].city || ""
          }, ${address[0].region || ""} ${address[0].postalCode || ""}`
        : "无法获取地址信息";

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: fullAddress,
      };

      setCurrentLocation(newLocation);

      // 使用animateToRegion移动到当前位置
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      // 使用mapRef来动画移动到新位置
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

      setMapRegion(newRegion);
      console.log("Updated mapRegion to:", newRegion);
    } catch (error) {
      console.error("获取位置失败:", error);
      Alert.alert("错误", "获取位置失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 保存位置到后端
  const saveLocation = async () => {
    if (!currentLocation || !user) {
      Alert.alert("错误", "请先获取当前位置");
      return;
    }

    try {
      setIsLoading(true);

      const locationData: CreateUserLocationRequest = {
        label: "当前位置",
        full_address: currentLocation.address,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        is_primary: true,
        is_active: true,
      };

      const response = await consumerApi.createUserLocation(locationData);

      if (response.success) {
        Alert.alert("成功", "位置已保存到您的账户");
      } else {
        Alert.alert("错误", response.message || "保存位置失败");
      }
    } catch (error: any) {
      console.error("保存位置失败:", error);

      // 处理特定错误
      if (error.message?.includes("LOCATION_LIMIT_EXCEEDED")) {
        Alert.alert("错误", "您已达到位置数量限制（最多5个位置）");
      } else if (error.message?.includes("Token已過期且無法刷新")) {
        Alert.alert("登录已过期", "请重新登录后再试", [
          {
            text: "确定",
            onPress: async () => {
              await logout();
            },
          },
        ]);
      } else {
        Alert.alert("错误", "保存位置失败，请重试");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setDefaultLocation = () => {
    setCurrentLocation({
      latitude: 25.033,
      longitude: 121.5654,
      address: "預設位置",
    });
    setMapRegion({
      latitude: 25.033,
      longitude: 121.5654,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: 25.033,
          longitude: 121.5654,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* 地图区域 */}
      <View className="flex-1">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={mapRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={false}
          mapType="standard"
        >
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="当前位置"
              description={currentLocation.address}
            />
          )}
        </MapView>
      </View>

      {/* 底部功能区域 */}
      <View className="bg-white p-5 shadow-lg mb-16">
        {/* 按钮区域 - 横排布局 */}
        <View className="flex-row space-x-3 mb-4 gap-3">
          <TouchableOpacity
            className="flex-1 bg-green-500 p-4 rounded-lg items-center"
            onPress={setDefaultLocation}
            disabled={isLoading}
          >
            <Text className="text-white text-sm font-semibold text-center">
              預設位置
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-blue-500 p-4 rounded-lg items-center"
            onPress={getCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-sm font-semibold text-center">
                获取当前位置
              </Text>
            )}
          </TouchableOpacity>

          {currentLocation && (
            <TouchableOpacity
              className="flex-1 bg-orange-500 p-4 rounded-lg items-center"
              onPress={saveLocation}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-sm font-semibold text-center">
                  保存位置
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* 位置信息显示 */}
        {currentLocation && (
          <View className="bg-gray-50 p-4 rounded-lg mb-4">
            <Text className="text-base font-semibold mb-2 text-gray-800">
              当前位置信息：
            </Text>
            <Text className="text-sm mb-1 text-gray-600">
              纬度: {currentLocation.latitude.toFixed(6)}
            </Text>
            <Text className="text-sm mb-1 text-gray-600">
              经度: {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text className="text-sm text-gray-600" numberOfLines={2}>
              地址: {currentLocation.address}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default LocationPage;
