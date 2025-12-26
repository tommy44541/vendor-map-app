import { useAuth } from "@/contexts/AuthContext";
import {
  consumerApi,
  CreateUserLocationRequest,
  UserLocation,
} from "@/services/api/consumer";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

const LocationPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    source: "gps" | "map";
  } | null>(null);
  const [createLabel, setCreateLabel] = useState("");
  const [createIsPrimary, setCreateIsPrimary] = useState(false);
  const [savedLocations, setSavedLocations] = useState<UserLocation[]>([]);
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
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<UserLocation>>(null);

  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return savedLocations.find((l) => l.ID === selectedLocationId) || null;
  }, [savedLocations, selectedLocationId]);

  const selectLocation = (location: UserLocation, index?: number) => {
    setSelectedLocationId(location.ID);
    animateTo(location.Latitude, location.Longitude);
    if (typeof index === "number" && index >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      });
    }
  };

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

      const response = await consumerApi.getUserLocations();
      if (response.success) {
        const nextLocations = Array.isArray(response.data) ? response.data : [];
        setSavedLocations(nextLocations);

        // 若有指定要選取的 location（新增/更新後），優先選取並捲動到該筆
        if (preferredLocationId) {
          const preferredIndex = nextLocations.findIndex(
            (l) => l.ID === preferredLocationId
          );
          const preferred =
            preferredIndex >= 0 ? nextLocations[preferredIndex] : null;
          if (preferred) {
            selectLocation(preferred, preferredIndex);
            return;
          }
        }

        const hasSelected =
          !!selectedLocationId &&
          nextLocations.some((l) => l.ID === selectedLocationId);

        // 進頁面時：若有 Primary 則預設選他；否則選第一筆
        // 若目前選取的 location 被刪掉/不存在，也套用同樣的預設規則
        if (!hasSelected) {
          const defaultIndex = nextLocations.findIndex((l) => l.IsPrimary);
          const resolvedIndex = defaultIndex >= 0 ? defaultIndex : 0;
          const defaultLocation = nextLocations[resolvedIndex] ?? null;

          if (defaultLocation) {
            selectLocation(defaultLocation, resolvedIndex);
          } else {
            setSelectedLocationId(null);
          }
        }
      } else {
        Alert.alert("錯誤", response.message || "獲取位置列表失敗");
      }
    } catch (error: any) {
      console.error("獲取位置列表失敗:", error);
      if (error.message?.includes("Token已過期且無法刷新")) {
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

  // 获取当前位置
  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);

      // 请求位置权限
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限被拒絕", "需要位置權限才能獲取當前位置");
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
        : "無法獲取地址信息";

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: fullAddress,
        source: "gps" as const,
      };

      setCurrentLocation(newLocation);

      // 聚焦到当前位置
      animateTo(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error("獲取位置失敗:", error);
      Alert.alert("錯誤", "獲取位置失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  // 點選地圖任意位置：反向地理編碼取得地址
  const handleMapPress = async (e: any) => {
    const action = e?.nativeEvent?.action;
    if (action === "marker-press" || action === "poi-click") return;

    const coordinate = e?.nativeEvent?.coordinate;
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

      // 讓使用者點選後再填 label：若目前還是預設值，先清空
      setCreateLabel((prev) => (prev.trim() === "當前位置" ? "" : prev));

      animateTo(coordinate.latitude, coordinate.longitude);
    } catch (error) {
      console.error("地圖選點失敗:", error);
      Alert.alert("錯誤", "地圖選點失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  // 保存位置到后端
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

      const locationData: CreateUserLocationRequest = {
        label: nextLabel,
        full_address: currentLocation.address,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        is_primary: createIsPrimary,
        is_active: true,
      };

      const response = await consumerApi.createUserLocation(locationData);

      if (response.success) {
        Alert.alert("成功", "位置已保存到您的帳戶");
        setCreateIsPrimary(false);
        await loadSavedLocations("initial", response.data?.ID);
      } else {
        Alert.alert("錯誤", response.message || "保存位置失败");
      }
    } catch (error: any) {
      console.error("保存位置失敗:", error);

      // 处理特定错误
      if (error.message?.includes("LOCATION_LIMIT_EXCEEDED")) {
        Alert.alert("錯誤", "您已達到位置數量限制（最多5個位置）");
      } else if (error.message?.includes("Token已過期且無法刷新")) {
        handleAuthExpired();
      } else {
        Alert.alert("錯誤", "保存位置失敗，請重試");
      }
    } finally {
      setCurrentLocation(null);
      setIsLoading(false);
    }
  };

  const openEditModal = (location: UserLocation) => {
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
      const response = await consumerApi.updateUserLocation(editLocationId, {
        label: nextLabel,
        is_active: editIsActive,
        is_primary: editIsPrimary,
      });

      if (!response.success) {
        Alert.alert("錯誤", response.message || "更新位置失敗");
        return;
      }

      closeEditModal();
      // 更新後讓清單與排序以後端為準，並自動跳到更新的那筆
      await loadSavedLocations("initial", editLocationId);
    } catch (error: any) {
      console.error("更新位置失敗:", error);
      if (error.message?.includes("Token已過期且無法刷新")) {
        handleAuthExpired();
      } else {
        Alert.alert("錯誤", "更新位置失敗，請重試");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmDelete = (location: UserLocation) => {
    Alert.alert("確認刪除", `確定要刪除「${location.Label}」嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          try {
            setIsListLoading(true);
            const response = await consumerApi.deleteUserLocation(location.ID);
            if (response.success) {
              setSavedLocations((prev) =>
                prev.filter((l) => l.ID !== location.ID)
              );
              if (selectedLocationId === location.ID) {
                setSelectedLocationId(null);
              }
            } else {
              Alert.alert("錯誤", response.message || "刪除位置失敗");
            }
          } catch (error: any) {
            console.error("刪除位置失敗:", error);
            if (error.message?.includes("Token已過期且無法刷新")) {
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

  const renderLocationItem = ({ item }: { item: UserLocation }) => {
    const isSelected = item.ID === selectedLocationId;
    return (
      <Pressable
        onPress={() => {
          setSelectedLocationId(item.ID);
          animateTo(item.Latitude, item.Longitude);
        }}
        className={`border rounded-lg p-3 mb-3 ${
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
        }`}
      >
        <View className="flex-row justify-between items-center gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-semibold text-gray-800">
                {item.Label}
              </Text>
              {item.IsPrimary && (
                <View className="bg-purple-100 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-purple-700">Primary</Text>
                </View>
              )}
              <View
                className={`px-2 py-0.5 rounded-full${
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
      {/* 地图区域 */}
      <View className="flex-1">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={mapRegion}
          onRegionChangeComplete={setMapRegion}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={false}
          mapType="standard"
        >
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.Latitude,
                longitude: selectedLocation.Longitude,
              }}
              title={selectedLocation.Label}
              description={selectedLocation.FullAddress}
              pinColor="#3b82f6"
            />
          )}
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title={currentLocation.source === "gps" ? "當前位置" : "選取位置"}
              description={currentLocation.address}
              pinColor="#f97316"
            />
          )}
        </MapView>
      </View>

      {/* 底部功能区域 */}
      <View className="bg-white p-5 shadow-lg mb-16">
        {/* 按钮区域 - 横排布局 */}
        <View className="flex-row space-x-3 mb-4 gap-3">
          <TouchableOpacity
            className="flex-1 bg-blue-500 p-4 rounded-lg items-center"
            onPress={getCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-sm font-semibold text-center">
                獲取當前位置
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

        {/* 新增位置選項 */}
        {currentLocation && (
          <View className="mb-4 bg-gray-50 p-4 rounded-lg">
            <Text className="text-sm font-semibold text-gray-800 mb-2">
              新增位置名稱
            </Text>
            <TextInput
              value={createLabel}
              onChangeText={setCreateLabel}
              placeholder="例如：家 / 公司 / 客戶A"
              className="border border-gray-200 bg-white rounded-lg px-3 py-3 text-gray-800"
              editable={!isLoading}
              maxLength={30}
              returnKeyType="done"
            />

            <View className="flex-row items-center justify-between mt-4">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-gray-800">
                  設為 Primary
                </Text>
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

        {/* 已保存位置列表 */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-800">
            已保存位置
          </Text>
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
            <FlatList
              ref={listRef}
              data={savedLocations}
              keyExtractor={(item) => item.ID}
              renderItem={renderLocationItem}
              refreshing={isRefreshing}
              onRefresh={() => loadSavedLocations("refresh")}
              onScrollToIndexFailed={({ index }) => {
                // 先粗略滾動到附近，避免直接報錯
                listRef.current?.scrollToOffset({
                  offset: Math.max(0, index) * 80,
                  animated: true,
                });
                setTimeout(() => {
                  listRef.current?.scrollToIndex({
                    index: Math.max(0, index),
                    animated: true,
                    viewPosition: 0.5,
                  });
                }, 100);
              }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>

      {/* 编辑 Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white p-5 rounded-t-2xl">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              編輯位置
            </Text>

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
};

export default LocationPage;
