import { useAuth } from "@/contexts/AuthContext";
import { UnifiedMap, UnifiedMapRef } from "@/components/maps/UnifiedMap";
import { ApiError } from "@/services/api/util";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { Region } from "react-native-maps";

export interface LocationRecord {
  ID: string;
  Label: string;
  FullAddress: string;
  Latitude: number;
  Longitude: number;
  IsPrimary: boolean;
  IsActive: boolean;
}

export interface CreateLocationRequest {
  label: string;
  full_address: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
  is_active: boolean;
}

export interface UpdateLocationRequest {
  label: string;
  is_active: boolean;
  is_primary: boolean;
}

export interface LocationApi<T extends LocationRecord> {
  list: () => Promise<{ data: T[] }>;
  create: (body: CreateLocationRequest) => Promise<{ data: T }>;
  update: (id: string, body: UpdateLocationRequest) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}

interface LocationManagerScreenProps<T extends LocationRecord> {
  api: LocationApi<T>;
  accentColor: string;
  createLabelPlaceholder: string;
  saveSuccessMessage: string;
}

export default function LocationManagerScreen<T extends LocationRecord>({
  api,
  accentColor,
  createLabelPlaceholder,
  saveSuccessMessage,
}: LocationManagerScreenProps<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    source: "gps" | "map" | "manual";
  } | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<
    Location.LocationGeocodedLocation[]
  >([]);
  const [geocodeModalVisible, setGeocodeModalVisible] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [createIsPrimary, setCreateIsPrimary] = useState(false);
  const [savedLocations, setSavedLocations] = useState<T[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLocationId, setEditLocationId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIsPrimary, setEditIsPrimary] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 25.033,
    longitude: 121.5654,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const { user, logout } = useAuth();
  const mapRef = useRef<UnifiedMapRef>(null);

  const { height: windowHeight } = useWindowDimensions();
  const TAB_BAR_HEIGHT = 70;
  const COLLAPSED_HEIGHT = 56;
  const expandedHeight = Math.min(Math.round(windowHeight * 0.62), 560);
  const maxTranslate = Math.max(0, expandedHeight - COLLAPSED_HEIGHT);
  const translateY = useSharedValue(maxTranslate);
  const startY = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 900,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [pulse]);

  useEffect(() => {
    translateY.value = Math.min(translateY.value, maxTranslate);
  }, [maxTranslate, translateY]);

  const collapseSheet = useMemo(
    () => () => {
      translateY.value = withSpring(maxTranslate, {
        damping: 22,
        stiffness: 220,
      });
    },
    [maxTranslate, translateY]
  );

  const expandSheet = useMemo(
    () => () => {
      translateY.value = withSpring(0, {
        damping: 22,
        stiffness: 220,
      });
    },
    [translateY]
  );

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onBegin(() => {
        startY.value = translateY.value;
      })
      .onUpdate((e) => {
        const next = startY.value + e.translationY;
        translateY.value = Math.max(0, Math.min(maxTranslate, next));
      })
      .onEnd((e) => {
        const shouldExpand =
          translateY.value < maxTranslate * 0.5 || e.velocityY < -800;
        translateY.value = withSpring(shouldExpand ? 0 : maxTranslate, {
          damping: 22,
          stiffness: 220,
        });
      });
  }, [maxTranslate, startY, translateY]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const pulseLineStyle = useAnimatedStyle(() => {
    const progress = maxTranslate <= 0 ? 1 : translateY.value / maxTranslate;
    const base = 0.18 + pulse.value * 0.55;
    return {
      opacity: base * Math.max(0, Math.min(1, progress)),
    };
  }, [maxTranslate]);

  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return savedLocations.find((l) => l.ID === selectedLocationId) || null;
  }, [savedLocations, selectedLocationId]);

  const animateTo = (latitude: number, longitude: number) => {
    const newRegion = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
    setMapRegion(newRegion);
  };

  const selectLocation = (location: T) => {
    setSelectedLocationId(location.ID);
    animateTo(location.Latitude, location.Longitude);
  };

  const handleAuthExpired = () => {
    Alert.alert("登錄已過期", "請重新登入後再試", [
      {
        text: "確定",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const loadSavedLocations = async (
    mode: "initial" | "refresh" = "initial",
    preferredLocationId?: string | null
  ) => {
    try {
      if (mode === "refresh") {
        setIsRefreshing(true);
      } else {
        setIsListLoading(true);
      }

      const response = await api.list();
      const nextLocations = Array.isArray(response.data) ? response.data : [];
      setSavedLocations(nextLocations);

      if (preferredLocationId) {
        const preferredIndex = nextLocations.findIndex(
          (l) => l.ID === preferredLocationId
        );
        const preferred =
          preferredIndex >= 0 ? nextLocations[preferredIndex] : null;
        if (preferred) {
          selectLocation(preferred);
          return;
        }
      }

      const hasSelected =
        !!selectedLocationId &&
        nextLocations.some((l) => l.ID === selectedLocationId);

      if (!hasSelected) {
        const defaultIndex = nextLocations.findIndex((l) => l.IsPrimary);
        const resolvedIndex = defaultIndex >= 0 ? defaultIndex : 0;
        const defaultLocation = nextLocations[resolvedIndex] ?? null;

        if (defaultLocation) {
          selectLocation(defaultLocation);
        } else {
          setSelectedLocationId(null);
        }
      }
    } catch (error: unknown) {
      console.error("獲取位置列表失敗:", error);
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        handleAuthExpired();
      } else {
        Alert.alert("錯誤", "獲取位置列表失敗，請重試");
      }
    } finally {
      setIsListLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSavedLocations("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限被拒絕", "需要位置權限才能獲取當前位置");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const fullAddress = address[0]
        ? `${address[0].street || ""} ${address[0].streetNumber || ""}, ${
            address[0].city || ""
          }, ${address[0].region || ""} ${address[0].postalCode || ""}`
        : "無法獲取地址信息";

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: fullAddress,
        source: "gps" as const,
      };

      setCurrentLocation(newLocation);
      animateTo(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error("獲取位置失敗:", error);
      Alert.alert("錯誤", "獲取位置失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoordinatePress = async (coordinate: {
    latitude: number;
    longitude: number;
  }) => {
    if (!coordinate?.latitude || !coordinate?.longitude) return;
    try {
      setIsLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限被拒絕", "需要位置權限才能選取地點");
        return;
      }

      const results = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });

      const a = results?.[0];
      const fullAddress = a
        ? `${a.street || ""} ${a.streetNumber || ""}, ${a.city || ""}, ${
            a.region || ""
          } ${a.postalCode || ""}`.trim()
        : "無法獲取地址信息";

      setCurrentLocation({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: fullAddress,
        source: "map",
      });

      setCreateLabel((prev) => (prev.trim() === "當前位置" ? "" : prev));
      animateTo(coordinate.latitude, coordinate.longitude);
    } catch (error) {
      console.error("地圖選點失敗:", error);
      Alert.alert("錯誤", "地圖選點失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  const applyGeocodedCoordinate = async (latitude: number, longitude: number) => {
    try {
      collapseSheet();
      setIsLoading(true);
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const a = results?.[0];
      const fullAddress = a
        ? `${a.street || ""} ${a.streetNumber || ""}, ${a.city || ""}, ${
            a.region || ""
          } ${a.postalCode || ""}`.trim()
        : addressQuery.trim() || "無法獲取地址信息";

      setCurrentLocation({
        latitude,
        longitude,
        address: fullAddress,
        source: "manual",
      });
      setCreateLabel((prev) => (prev.trim() === "當前位置" ? "" : prev));
      animateTo(latitude, longitude);
    } catch (e) {
      console.error("套用地址搜尋結果失敗:", e);
      Alert.alert("錯誤", "無法套用該地址，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  const searchAddress = async () => {
    const q = addressQuery.trim();
    if (!q) {
      Alert.alert("提示", "請輸入地址或地標關鍵字");
      return;
    }

    try {
      setIsGeocoding(true);
      const list = await Location.geocodeAsync(q);
      if (!Array.isArray(list) || list.length === 0) {
        Alert.alert("找不到地址", "請嘗試輸入更完整的地址（包含城市/區域）");
        return;
      }
      if (list.length === 1) {
        await applyGeocodedCoordinate(list[0].latitude, list[0].longitude);
        return;
      }
      setGeocodeResults(list.slice(0, 10));
      setGeocodeModalVisible(true);
    } catch (e) {
      console.error("地址搜尋失敗:", e);
      Alert.alert("錯誤", "地址搜尋失敗，請稍後重試");
    } finally {
      setIsGeocoding(false);
    }
  };

  const saveLocation = async () => {
    if (!currentLocation || !user) {
      Alert.alert("錯誤", "請先獲取當前位置");
      return;
    }

    const nextLabel = createLabel.trim();
    if (!nextLabel) {
      Alert.alert("錯誤", "請輸入位置名稱");
      return;
    }

    try {
      setIsLoading(true);
      const locationData: CreateLocationRequest = {
        label: nextLabel,
        full_address: currentLocation.address,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        is_primary: createIsPrimary,
        is_active: true,
      };

      const response = await api.create(locationData);
      Alert.alert("成功", saveSuccessMessage);
      setCreateIsPrimary(false);
      await loadSavedLocations("initial", response.data?.ID);
    } catch (error: unknown) {
      console.error("保存位置失敗:", error);
      if (error instanceof ApiError && error.code === "LOCATION_LIMIT_EXCEEDED") {
        Alert.alert("錯誤", "您已達到位置數量限制（最多5個位置）");
      } else if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        handleAuthExpired();
      } else {
        Alert.alert("錯誤", "保存位置失敗，請重試");
      }
    } finally {
      setCurrentLocation(null);
      setCreateLabel("");
      setIsLoading(false);
    }
  };

  const openEditModal = (location: T) => {
    setEditLocationId(location.ID);
    setEditLabel(location.Label || "");
    setEditIsPrimary(!!location.IsPrimary);
    setEditIsActive(!!location.IsActive);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setEditIsPrimary(false);
    setEditModalVisible(false);
    setEditLocationId(null);
    setEditLabel("");
    setEditIsActive(true);
  };

  const submitEdit = async () => {
    if (!editLocationId) return;
    const nextLabel = editLabel.trim();
    if (!nextLabel) {
      Alert.alert("錯誤", "Label 不能為空");
      return;
    }

    try {
      setIsSavingEdit(true);
      await api.update(editLocationId, {
        label: nextLabel,
        is_active: editIsActive,
        is_primary: editIsPrimary,
      });

      closeEditModal();
      await loadSavedLocations("initial", editLocationId);
    } catch (error: unknown) {
      console.error("更新位置失敗:", error);
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        handleAuthExpired();
      } else {
        Alert.alert("錯誤", "更新位置失敗，請重試");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmDelete = (location: T) => {
    Alert.alert("確認刪除", `確定要刪除「${location.Label}」嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          try {
            setIsListLoading(true);
            await api.remove(location.ID);
            setSavedLocations((prev) => prev.filter((l) => l.ID !== location.ID));
            if (selectedLocationId === location.ID) {
              setSelectedLocationId(null);
            }
          } catch (error: unknown) {
            console.error("刪除位置失敗:", error);
            if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
              handleAuthExpired();
            } else {
              Alert.alert("錯誤", "刪除位置失敗，請重試");
            }
          } finally {
            setIsListLoading(false);
          }
        },
      },
    ]);
  };

  const renderLocationItem = (item: T) => {
    const isSelected = item.ID === selectedLocationId;
    return (
      <Pressable
        key={item.ID}
        onPress={() => {
          setSelectedLocationId(item.ID);
          animateTo(item.Latitude, item.Longitude);
        }}
        className={`border rounded-lg p-3 mb-3 ${
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
        }`}
      >
        <View className="flex-row justify-between items-start gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-semibold text-gray-800">{item.Label}</Text>
              {item.IsPrimary && (
                <View className="bg-purple-100 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-purple-700">Primary</Text>
                </View>
              )}
              <View
                className={`px-2 py-0.5 rounded-full ${
                  item.IsActive ? "bg-green-100" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs ${
                    item.IsActive ? "text-green-700" : "text-gray-700"
                  }`}
                >
                  {item.IsActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
              {item.FullAddress}
            </Text>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              className="bg-blue-500 px-3 py-2 rounded-md"
              onPress={() => openEditModal(item)}
            >
              <Text className="text-white text-xs font-semibold">編輯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-500 px-3 py-2 rounded-md"
              onPress={() => confirmDelete(item)}
            >
              <Text className="text-white text-xs font-semibold">刪除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-1">
        <UnifiedMap
          ref={mapRef}
          style={{ flex: 1 }}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          onPress={(e) => {
            collapseSheet();
            handleCoordinatePress(e);
          }}
          showsUserLocation
          showsMyLocationButton
          markers={[
            ...(selectedLocation
              ? [
                  {
                    id: `selected-${selectedLocation.ID}`,
                    latitude: selectedLocation.Latitude,
                    longitude: selectedLocation.Longitude,
                    title: selectedLocation.Label,
                    description: selectedLocation.FullAddress,
                    pinColor: "#3b82f6",
                  },
                ]
              : []),
            ...(currentLocation
              ? [
                  {
                    id: `current-${currentLocation.source}`,
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    title:
                      currentLocation.source === "gps"
                        ? "當前位置"
                        : currentLocation.source === "manual"
                          ? "搜尋位置"
                          : "選取位置",
                    description: currentLocation.address,
                    pinColor: "#f97316",
                  },
                ]
              : []),
          ]}
        />
      </View>

      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: TAB_BAR_HEIGHT,
            height: expandedHeight,
          },
          sheetAnimatedStyle,
        ]}
        className="bg-white border-t border-gray-200 rounded-t-3xl overflow-hidden"
      >
        <GestureDetector gesture={panGesture}>
          <Pressable onPress={expandSheet} className="py-3 items-center">
            <Animated.View
              style={[pulseLineStyle, { backgroundColor: accentColor }]}
              className="absolute top-0 left-0 right-0 h-[2px]"
            />
            <View className="w-12 h-1.5 rounded-full bg-gray-200" />
          </Pressable>
        </GestureDetector>

        <ScrollView
          className="px-5 pb-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-4 bg-gray-50 p-4 rounded-lg">
            <Text className="text-sm font-semibold text-gray-800 mb-2">手動輸入地址</Text>
            <View className="flex-row gap-3">
              <TextInput
                value={addressQuery}
                onChangeText={setAddressQuery}
                placeholder="例如：台北市中正區忠孝西路一段"
                className="flex-1 border border-gray-200 bg-white rounded-lg px-3 py-3 text-gray-800"
                editable={!isLoading && !isGeocoding}
                returnKeyType="search"
                onSubmitEditing={searchAddress}
              />
              <TouchableOpacity
                className={`px-4 rounded-lg items-center justify-center ${
                  isGeocoding ? "bg-gray-300" : "bg-gray-900"
                }`}
                onPress={searchAddress}
                disabled={isLoading || isGeocoding}
                activeOpacity={0.85}
              >
                {isGeocoding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">搜尋</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-gray-500 mt-2 leading-5">
              找不到時請輸入更完整地址（城市/區域/路名）。
            </Text>
          </View>

          <View className="flex-row space-x-3 mb-4 gap-3">
            <TouchableOpacity
              className="flex-1 bg-blue-500 p-4 rounded-lg items-center"
              onPress={getCurrentLocation}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-sm font-semibold text-center">獲取當前位置</Text>
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
                  <Text className="text-white text-sm font-semibold text-center">保存位置</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {currentLocation && (
            <View className="mb-4 bg-gray-50 p-4 rounded-lg">
              <Text className="text-sm font-semibold text-gray-800 mb-2">新增位置名稱</Text>
              <TextInput
                value={createLabel}
                onChangeText={setCreateLabel}
                placeholder={createLabelPlaceholder}
                className="border border-gray-200 bg-white rounded-lg px-3 py-3 text-gray-800"
                editable={!isLoading}
                maxLength={30}
                returnKeyType="done"
              />

              <View className="flex-row items-center justify-between mt-4">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-gray-800">設為 Primary</Text>
                  <Text className="text-xs text-gray-600 mt-1">
                    勾選後，這筆新位置會以 Primary 保存
                  </Text>
                </View>
                <Switch
                  value={createIsPrimary}
                  onValueChange={setCreateIsPrimary}
                  disabled={isLoading}
                />
              </View>
            </View>
          )}

          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">已保存位置</Text>
            <TouchableOpacity
              className="bg-gray-200 px-3 py-2 rounded-md"
              onPress={() => loadSavedLocations("refresh")}
              disabled={isListLoading || isRefreshing}
            >
              <Text className="text-xs text-gray-800 font-semibold">
                {isListLoading || isRefreshing ? "加載中..." : "刷新"}
              </Text>
            </TouchableOpacity>
          </View>

          {isListLoading && savedLocations.length === 0 ? (
            <View className="py-6 items-center">
              <ActivityIndicator />
              <Text className="text-sm text-gray-600 mt-2">加載中...</Text>
            </View>
          ) : savedLocations.length === 0 ? (
            <View className="py-6">
              <Text className="text-sm text-gray-600">
                暫無已保存位置。你可以先獲取當前位置並保存。
              </Text>
            </View>
          ) : (
            <View style={{ maxHeight: 240 }}>
              {savedLocations.map(renderLocationItem)}
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <Modal
        visible={geocodeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGeocodeModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center px-6"
          onPress={() => setGeocodeModalVisible(false)}
        >
          <Pressable className="bg-white rounded-2xl p-5" onPress={() => {}}>
            <Text className="text-lg font-semibold text-gray-900">選擇一個候選位置</Text>
            <Text className="text-xs text-gray-500 mt-1">
              共有 {geocodeResults.length} 筆候選（顯示最多 10 筆）
            </Text>

            <View className="mt-4">
              {geocodeResults.map((r, idx) => (
                <Pressable
                  key={`${r.latitude}-${r.longitude}-${idx}`}
                  className="py-3 border-b border-gray-100"
                  onPress={async () => {
                    setGeocodeModalVisible(false);
                    await applyGeocodedCoordinate(r.latitude, r.longitude);
                  }}
                >
                  <Text className="text-sm font-semibold text-gray-900">候選 {idx + 1}</Text>
                  <Text className="text-xs text-gray-600 mt-1">
                    lat: {r.latitude.toFixed(6)}, lng: {r.longitude.toFixed(6)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TouchableOpacity
              className="mt-4 bg-gray-200 rounded-xl py-3 items-center"
              onPress={() => setGeocodeModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text className="text-gray-800 font-semibold">取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white p-5 rounded-t-2xl">
            <Text className="text-lg font-semibold text-gray-800 mb-4">編輯位置</Text>

            <Text className="text-sm text-gray-700 mb-2">Label</Text>
            <TextInput
              value={editLabel}
              onChangeText={setEditLabel}
              placeholder="請輸入位置名稱"
              className="border border-gray-200 rounded-lg px-3 py-3 text-gray-800"
              editable={!isSavingEdit}
            />

            <View className="flex-row items-center justify-between mt-4">
              <Text className="text-sm text-gray-700">是否為 Primary</Text>
              <Switch
                value={editIsPrimary}
                onValueChange={setEditIsPrimary}
                disabled={isSavingEdit}
              />
            </View>

            <View className="flex-row items-center justify-between mt-4">
              <Text className="text-sm text-gray-700">是否啟用</Text>
              <Switch
                value={editIsActive}
                onValueChange={setEditIsActive}
                disabled={isSavingEdit}
              />
            </View>

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                className="flex-1 bg-gray-200 p-4 rounded-lg items-center"
                onPress={closeEditModal}
                disabled={isSavingEdit}
              >
                <Text className="text-gray-800 font-semibold">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-blue-500 p-4 rounded-lg items-center"
                onPress={submitEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
