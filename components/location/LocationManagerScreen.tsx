import { UnifiedMap, UnifiedMapRef } from "@/components/maps/UnifiedMap";
import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelLoading,
  PixelText,
  PixelTextInput,
} from "@/components/pixel";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api/util";
import {
  pixelBorderWidth,
  pixelColors,
  pixelRadius,
} from "@/theme/pixel";
import { getLocationDisplayLabel } from "@/utils/location/getLocationDisplayLabel";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {

  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  // tab bar 的實際高度 = 內容 74 + 系統 nav bar safe area。sheet 要 anchor
  // 在 tab bar 上方,加上額外 8px gap 讓 handle 不要緊貼 tab bar 不好點。
  const TAB_BAR_HEIGHT = 74 + insets.bottom + 8;
  const COLLAPSED_HEIGHT = 72; // 從 56 拉高,handle 區比較好用拇指拉
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
        Alert.alert("找不到地址", "請嘗試輸入更完整的地址(包含城市/區域)");
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
        Alert.alert("錯誤", "您已達到位置數量限制(最多5個位置)");
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
      Alert.alert("錯誤", "地點名稱不能為空");
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
    Alert.alert(
      "確認刪除",
      `確定要刪除「${getLocationDisplayLabel(location.Label)}」嗎？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            try {
              setIsListLoading(true);
              await api.remove(location.ID);
              setSavedLocations((prev) =>
                prev.filter((l) => l.ID !== location.ID)
              );
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
      ]
    );
  };

  const renderLocationItem = (item: T) => {
    const isSelected = item.ID === selectedLocationId;
    const displayLabel = getLocationDisplayLabel(item.Label);
    return (
      <Pressable
        key={item.ID}
        onPress={() => {
          setSelectedLocationId(item.ID);
          animateTo(item.Latitude, item.Longitude);
        }}
        style={[
          styles.listItem,
          isSelected ? styles.listItemSelected : null,
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.listItemTitleRow}>
            <PixelText variant="bodyLg">{displayLabel}</PixelText>
            {item.IsPrimary ? (
              <PixelChip label="主要" tone="purple" active />
            ) : null}
            <PixelChip
              label={item.IsActive ? "啟用" : "停用"}
              tone={item.IsActive ? "green" : "paper"}
              active
            />
          </View>
          <View style={{ height: 4 }} />
          <PixelText variant="caption" tone="muted" numberOfLines={2}>
            {item.FullAddress}
          </PixelText>
        </View>

        <View style={styles.listItemActions}>
          <PixelButton
            label="編輯"
            tone="blue"
            size="sm"
            onPress={() => openEditModal(item)}
          />
          <PixelButton
            label="x"
            tone="red"
            size="sm"
            display
            onPress={() => confirmDelete(item)}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <View style={{ flex: 1 }}>
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
                    title: getLocationDisplayLabel(selectedLocation.Label),
                    description: selectedLocation.FullAddress,
                    pinColor: pixelColors.blue,
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
                    pinColor: pixelColors.gold,
                  },
                ]
              : []),
          ]}
        />
      </View>

      <Animated.View
        style={[
          styles.sheet,
          {
            bottom: TAB_BAR_HEIGHT,
            height: expandedHeight,
          },
          sheetAnimatedStyle,
        ]}
      >
        <GestureDetector gesture={panGesture}>
          <Pressable onPress={expandSheet} style={styles.handleWrap}>
            <Animated.View
              style={[
                styles.pulseLine,
                pulseLineStyle,
                { backgroundColor: accentColor || pixelColors.gold },
              ]}
            />
            <View style={styles.handle} />
            <View style={{ height: 4 }} />
            <PixelText variant="caption" tone="muted" display>
              LOCATION  PANEL
            </PixelText>
          </Pressable>
        </GestureDetector>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
            gap: 12,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 地址搜尋 */}
          <PixelCard
            title="ADDRESS  SEARCH"
            titleTone="blue"
            titleDisplay
            padding={12}
          >
            <PixelTextInput
              placeholder="例如:台北市中正區忠孝西路一段"
              value={addressQuery}
              onChangeText={setAddressQuery}
              editable={!isLoading && !isGeocoding}
              returnKeyType="search"
              onSubmitEditing={searchAddress}
            />
            <View style={{ height: 10 }} />
            <PixelButton
              label={isGeocoding ? "..." : "> 搜尋地址"}
              tone="ink"
              fullWidth
              disabled={isLoading || isGeocoding}
              onPress={searchAddress}
            />
            <View style={{ height: 6 }} />
            <PixelText variant="caption" tone="muted">
              找不到時請輸入更完整地址(城市/區域/路名)。
            </PixelText>
          </PixelCard>

          {/* GPS / 保存 */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <PixelButton
                label={isLoading ? "..." : "> 取得目前位置"}
                tone="blue"
                fullWidth
                disabled={isLoading}
                onPress={getCurrentLocation}
              />
            </View>
            {currentLocation ? (
              <View style={{ flex: 1 }}>
                <PixelButton
                  label={isLoading ? "..." : "> 保存位置"}
                  tone="gold"
                  fullWidth
                  disabled={isLoading}
                  onPress={saveLocation}
                />
              </View>
            ) : null}
          </View>

          {/* 新增位置設定 */}
          {currentLocation ? (
            <PixelCard
              title="NEW  LOCATION"
              titleTone="gold"
              titleDisplay
              padding={12}
            >
              <PixelTextInput
                label="位置名稱"
                placeholder={createLabelPlaceholder}
                value={createLabel}
                onChangeText={setCreateLabel}
                editable={!isLoading}
                maxLength={30}
                returnKeyType="done"
              />
              <View style={{ height: 10 }} />
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <PixelText variant="bodyLg">設為主要地點</PixelText>
                  <PixelText variant="caption" tone="muted">
                    勾選後,這筆位置會成為主要地點
                  </PixelText>
                </View>
                <Switch
                  value={createIsPrimary}
                  onValueChange={setCreateIsPrimary}
                  disabled={isLoading}
                  trackColor={{
                    false: pixelColors.gray700,
                    true: pixelColors.gold,
                  }}
                  thumbColor={pixelColors.paper}
                />
              </View>

              <View style={{ height: 10 }} />
              <View style={styles.addressBox}>
                <PixelText variant="caption" tone="gold" display>
                  CURRENT  ADDRESS
                </PixelText>
                <View style={{ height: 4 }} />
                <PixelText variant="body">{currentLocation.address}</PixelText>
              </View>
            </PixelCard>
          ) : null}

          {/* 已保存位置 */}
          <View style={styles.savedHeader}>
            <PixelText variant="bodyLg">已保存位置</PixelText>
            <PixelButton
              label={isListLoading || isRefreshing ? "..." : ">> 刷新"}
              tone="paper"
              size="sm"
              disabled={isListLoading || isRefreshing}
              onPress={() => loadSavedLocations("refresh")}
            />
          </View>

          {isListLoading && savedLocations.length === 0 ? (
            <View style={styles.emptyBox}>
              <PixelLoading label="" size="sm" tone="gold" />
              <View style={{ height: 6 }} />
              <PixelText variant="caption" tone="muted">
                加載中...
              </PixelText>
            </View>
          ) : savedLocations.length === 0 ? (
            <View style={styles.emptyBox}>
              <PixelText variant="body" tone="muted">
                暫無已保存位置。先取得目前位置或搜尋地址再保存。
              </PixelText>
            </View>
          ) : (
            <View style={{ gap: 8 }}>{savedLocations.map(renderLocationItem)}</View>
          )}
        </ScrollView>
      </Animated.View>

      {/* 候選地址 Modal */}
      <Modal
        visible={geocodeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGeocodeModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setGeocodeModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <PixelCard
              title="GEOCODE  CANDIDATES"
              titleTone="blue"
              titleDisplay
              padding={16}
              style={styles.modalCard}
            >
              <PixelText variant="body">選擇一個候選位置</PixelText>
              <View style={{ height: 4 }} />
              <PixelText variant="caption" tone="muted">
                共 {geocodeResults.length} 筆候選(顯示最多 10 筆)
              </PixelText>

              <View style={{ height: 12 }} />
              <View style={{ gap: 8 }}>
                {geocodeResults.map((r, idx) => (
                  <Pressable
                    key={`${r.latitude}-${r.longitude}-${idx}`}
                    style={styles.candidateRow}
                    onPress={async () => {
                      setGeocodeModalVisible(false);
                      await applyGeocodedCoordinate(r.latitude, r.longitude);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <PixelText variant="bodyLg">候選 {idx + 1}</PixelText>
                      <PixelText variant="caption" tone="muted">
                        lat {r.latitude.toFixed(6)} / lng {r.longitude.toFixed(6)}
                      </PixelText>
                    </View>
                    <PixelText variant="title" tone="gold" display>
                      {">"}
                    </PixelText>
                  </Pressable>
                ))}
              </View>

              <View style={{ height: 12 }} />
              <PixelButton
                label="取消"
                tone="paper"
                fullWidth
                onPress={() => setGeocodeModalVisible(false)}
              />
            </PixelCard>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 編輯 Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalBottomWrap}>
          <PixelCard
            title="EDIT  LOCATION"
            titleTone="purple"
            titleDisplay
            padding={16}
            style={styles.modalBottomCard}
          >
            <PixelTextInput
              label="地點名稱"
              placeholder="請輸入位置名稱"
              value={editLabel}
              onChangeText={setEditLabel}
              editable={!isSavingEdit}
            />

            <View style={{ height: 12 }} />
            <View style={styles.switchRow}>
              <PixelText variant="bodyLg">設為主要地點</PixelText>
              <Switch
                value={editIsPrimary}
                onValueChange={setEditIsPrimary}
                disabled={isSavingEdit}
                trackColor={{
                  false: pixelColors.gray700,
                  true: pixelColors.gold,
                }}
                thumbColor={pixelColors.paper}
              />
            </View>

            <View style={{ height: 8 }} />
            <View style={styles.switchRow}>
              <PixelText variant="bodyLg">是否啟用</PixelText>
              <Switch
                value={editIsActive}
                onValueChange={setEditIsActive}
                disabled={isSavingEdit}
                trackColor={{
                  false: pixelColors.gray700,
                  true: pixelColors.green,
                }}
                thumbColor={pixelColors.paper}
              />
            </View>

            <View style={{ height: 16 }} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <PixelButton
                  label="取消"
                  tone="paper"
                  fullWidth
                  disabled={isSavingEdit}
                  onPress={closeEditModal}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PixelButton
                  label={isSavingEdit ? "..." : "> 保存"}
                  tone="blue"
                  fullWidth
                  disabled={isSavingEdit}
                  onPress={submitEdit}
                />
              </View>
            </View>
          </PixelCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
