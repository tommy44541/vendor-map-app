import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelText,
  PixelTextInput,
} from "@/components/pixel";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, type UserData } from "@/services/api/auth";
import {
  discoveryApi,
  type DiscoveryCategory,
  type DiscoveryHub,
  type MerchantDiscoveryProfile,
} from "@/services/api/discovery";
import { ApiError } from "@/services/api/util";
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const formatTime = (value?: string | null) => {
  if (!value) return "尚未驗證";
  if (value.startsWith("0001-01-01")) return "尚未驗證";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const DISCOVERY_LABELS: Record<string, string> = {
  food: "餐飲",
  experience: "生活體驗",
  other: "其他",
  meal: "餐食",
  snack: "小吃",
  beverage: "飲品",
  dessert: "甜點",
  goods: "商品",
  performance: "展演",
  grill: "燒烤",
  fried_food: "炸物",
  bakery: "烘焙",
  coffee: "咖啡",
  tea: "茶飲",
  handmade: "手作",
  accessory: "配件",
  workshop: "工作坊",
  market: "市集",
  event: "活動",
  tourism_area: "觀光區",
  transit_area: "交通節點",
};

const getDiscoveryLabel = (value?: { slug?: string; name?: string } | null) => {
  if (!value) return "未設定";
  return (
    DISCOVERY_LABELS[value.slug || ""] ||
    value.name ||
    value.slug ||
    "未設定"
  );
};

const Profile = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, syncUserFromApi } = useAuth();
  const [profile, setProfile] = useState<UserData | null>(null);
  const [discoveryProfile, setDiscoveryProfile] =
    useState<MerchantDiscoveryProfile | null>(null);
  const [discoveryCategories, setDiscoveryCategories] = useState<
    DiscoveryCategory[]
  >([]);
  const [discoveryHubs, setDiscoveryHubs] = useState<DiscoveryHub[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    string | null
  >(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [isPublicSelected, setIsPublicSelected] = useState(false);
  const [discoveryListError, setDiscoveryListError] = useState<string | null>(
    null
  );
  const [verificationInput, setVerificationInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDiscovery, setIsSavingDiscovery] = useState(false);
  const [discoveryEditing, setDiscoveryEditing] = useState(false);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const applyDiscoveryProfileToLocalState = useCallback(
    (next: MerchantDiscoveryProfile | null) => {
      setSelectedCategoryId(next?.discovery_category_id ?? null);
      setSelectedSubcategoryId(next?.discovery_subcategory_id ?? null);
      setSelectedHubId(next?.active_hub_id ?? null);
      setIsPublicSelected(!!next?.is_public);
    },
    []
  );

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setDiscoveryListError(null);
      const [profileRes, discoveryRes, categoriesRes, hubsRes] =
        await Promise.all([
          authApi.getProfile(),
          discoveryApi.getMerchantDiscoveryProfile().catch((error) => {
            console.warn("載入探索設定失敗:", error);
            return null;
          }),
          discoveryApi.listCategories().catch((error) => {
            console.warn("載入探索分類失敗:", error);
            setDiscoveryListError(
              "分類清單暫時無法載入,請稍後再試或請後端開放商家角色讀取。"
            );
            return null;
          }),
          discoveryApi.listHubs().catch((error) => {
            console.warn("載入聚集地清單失敗:", error);
            return null;
          }),
        ]);
      const nextProfile = profileRes.data;
      const nextDiscoveryProfile = discoveryRes?.data ?? null;
      syncUserFromApi(nextProfile);
      setProfile(nextProfile);
      setDiscoveryProfile(nextDiscoveryProfile);
      setDiscoveryCategories(categoriesRes?.data?.categories ?? []);
      setDiscoveryHubs(hubsRes?.data?.hubs ?? []);
      applyDiscoveryProfileToLocalState(nextDiscoveryProfile);
      setVerificationInput(
        nextProfile.merchant_profile?.business_license || ""
      );
    } catch (error: any) {
      console.error("載入商家個人資料失敗:", error);
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        return;
      }
      Alert.alert("錯誤", error?.message || "載入商家資料失敗");
    } finally {
      setIsLoading(false);
    }
  }, [applyDiscoveryProfileToLocalState, syncUserFromApi]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const merchantProfile = profile?.merchant_profile;
  const verificationStatus =
    merchantProfile?.verification_status || "unverified";
  const isVerified = verificationStatus === "verified";
  const canBePublic =
    !!discoveryProfile?.is_verified &&
    !!discoveryProfile?.has_active_primary_location &&
    !!selectedCategoryId &&
    !!selectedSubcategoryId;

  const selectedCategory = useMemo(
    () =>
      discoveryCategories.find(
        (category) => category.id === selectedCategoryId
      ) || null,
    [discoveryCategories, selectedCategoryId]
  );

  const selectedSubcategories = useMemo(
    () => selectedCategory?.subcategories ?? [],
    [selectedCategory]
  );

  const selectedSubcategory = useMemo(
    () =>
      selectedSubcategories.find(
        (subcategory) => subcategory.id === selectedSubcategoryId
      ) ||
      discoveryProfile?.discovery_subcategory ||
      null,
    [discoveryProfile?.discovery_subcategory, selectedSubcategories, selectedSubcategoryId]
  );

  const selectedHub = useMemo(
    () =>
      discoveryHubs.find((hub) => hub.id === selectedHubId) ||
      discoveryProfile?.active_hub ||
      null,
    [discoveryHubs, discoveryProfile?.active_hub, selectedHubId]
  );

  const selectCategory = useCallback(
    (categoryId: string | null) => {
      setSelectedCategoryId(categoryId);
      const nextCategory =
        discoveryCategories.find((category) => category.id === categoryId) ||
        null;
      const currentSubcategoryStillValid =
        !!selectedSubcategoryId &&
        !!nextCategory?.subcategories?.some(
          (subcategory) => subcategory.id === selectedSubcategoryId
        );
      if (!currentSubcategoryStillValid) {
        setSelectedSubcategoryId(nextCategory?.subcategories?.[0]?.id ?? null);
      }
    },
    [discoveryCategories, selectedSubcategoryId]
  );

  const submitVerification = useCallback(async () => {
    const businessLicense = verificationInput.trim();
    if (!businessLicense) {
      Alert.alert("提示", "請先輸入營業執照編號");
      return;
    }

    try {
      setIsSubmitting(true);
      await authApi.submitMerchantVerification({
        business_license: businessLicense,
      });
      Alert.alert("完成", "商家驗證已更新");
      await loadProfile();
    } catch (error: any) {
      console.error("商家驗證送出失敗:", error);
      if (error instanceof ApiError) {
        if (error.code === "TOKEN_EXPIRED") {
          return;
        }
        // 後端對「已驗證帳號再送一次」會回 409 CONFLICT。順手 reload
        // 把驗證狀態 sync 回來,按鈕就會自動 disable。
        if (error.status === 409) {
          Alert.alert("已完成驗證", "這個帳號已經完成商家驗證,不需要重複送出。");
          await loadProfile();
          return;
        }
      }
      Alert.alert("錯誤", error?.message || "商家驗證送出失敗");
    } finally {
      setIsSubmitting(false);
    }
  }, [loadProfile, verificationInput]);

  const saveDiscoveryProfile = useCallback(async () => {
    if (isPublicSelected && !canBePublic) {
      Alert.alert(
        "尚未符合公開條件",
        "公開前需要完成商家驗證、設定主要位置,並選擇主分類與子分類。"
      );
      return;
    }

    try {
      setIsSavingDiscovery(true);
      const res = await discoveryApi.updateMerchantDiscoveryProfile({
        discovery_category_id: selectedCategoryId,
        discovery_subcategory_id: selectedSubcategoryId,
        active_hub_id: selectedHubId,
        is_public: isPublicSelected,
      });
      setDiscoveryProfile(res.data);
      Alert.alert("完成", "公開探索設定已更新");
      setDiscoveryEditing(false);
      await loadProfile();
    } catch (error: any) {
      console.error("儲存探索設定失敗:", error);
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        return;
      }
      Alert.alert("錯誤", error?.message || "儲存探索設定失敗");
    } finally {
      setIsSavingDiscovery(false);
    }
  }, [
    canBePublic,
    isPublicSelected,
    loadProfile,
    selectedCategoryId,
    selectedHubId,
    selectedSubcategoryId,
  ]);

  const cancelDiscoveryEdit = useCallback(() => {
    applyDiscoveryProfileToLocalState(discoveryProfile);
    setDiscoveryEditing(false);
  }, [applyDiscoveryProfileToLocalState, discoveryProfile]);

  return (
    <View style={styles.root}>
      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <PixelText variant="caption" tone="red" display>
            VENDOR  ACCOUNT
          </PixelText>
          <PixelText variant="display">個人</PixelText>
          <View style={{ height: 4 }} />
          <PixelText variant="caption" tone="muted">
            {user?.name ? `${user.name} (商家)` : "商家帳號"}
          </PixelText>
        </View>
        <PixelButton
          label={isLoading ? "..." : ">> 重新整理"}
          tone="red"
          size="sm"
          disabled={isLoading || isSubmitting}
          onPress={() => void loadProfile()}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
          gap: 14,
        }}
      >
        {/* 商家驗證 */}
        <PixelCard
          title="VERIFICATION"
          titleTone={isVerified ? "green" : "gold"}
          titleDisplay
          padding={14}
        >
          <View style={styles.headerRow}>
            <View
              style={[
                styles.headerIcon,
                {
                  backgroundColor: isVerified
                    ? pixelColors.green
                    : pixelColors.gold,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={pixelColors.ink}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText variant="bodyLg">
                {isVerified ? "商家身分已驗證" : "完成商家驗證"}
              </PixelText>
              <PixelText variant="caption" tone="muted">
                {isVerified
                  ? "營業執照已通過後端驗證"
                  : "送出營業執照編號取得驗證"}
              </PixelText>
            </View>
            <PixelChip
              label={isVerified ? "已驗證" : "未驗證"}
              tone={isVerified ? "green" : "gold"}
              active
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.miniRow}>
            <PixelText variant="caption" tone="gold" display>
              LAST  VERIFIED
            </PixelText>
            <PixelText variant="body">
              {formatTime(merchantProfile?.business_license_verified_at)}
            </PixelText>
          </View>

          <View style={styles.divider} />

          <PixelTextInput
            label="營業執照編號"
            placeholder="請輸入營業執照編號"
            value={verificationInput}
            onChangeText={setVerificationInput}
            editable={!isSubmitting && !isVerified}
            autoCapitalize="characters"
          />

          <View style={{ height: 12 }} />
          <PixelButton
            label={
              isSubmitting
                ? "..."
                : isVerified
                  ? "已完成驗證"
                  : "> 送出商家驗證"
            }
            tone={isVerified ? "paper" : "red"}
            fullWidth
            disabled={isSubmitting || isVerified}
            onPress={() => void submitVerification()}
          />
        </PixelCard>

        {/* 公開探索設定 */}
        <PixelCard
          title="DISCOVERY  PROFILE"
          titleTone={discoveryProfile?.is_public ? "green" : "blue"}
          titleDisplay
          padding={14}
        >
          <View style={styles.headerRow}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: pixelColors.blue },
              ]}
            >
              <Ionicons
                name="compass-outline"
                size={18}
                color={pixelColors.ink}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText variant="bodyLg">公開探索設定</PixelText>
              <PixelText variant="caption" tone="muted">
                讓顧客在分類 / 區域 / 市集找到你
              </PixelText>
            </View>
            <PixelChip
              label={discoveryProfile?.is_public ? "公開中" : "未公開"}
              tone={discoveryProfile?.is_public ? "green" : "paper"}
              active
            />
          </View>

          {/* 目前選擇摘要 */}
          <View style={styles.divider} />
          <View style={styles.miniRow}>
            <PixelText variant="caption" tone="muted">
              主分類
            </PixelText>
            <PixelChip
              label={getDiscoveryLabel(
                selectedCategory || discoveryProfile?.discovery_category
              )}
              tone="gold"
              active
            />
          </View>
          <View style={{ height: 8 }} />
          <View style={styles.miniRow}>
            <PixelText variant="caption" tone="muted">
              子分類
            </PixelText>
            <PixelChip
              label={getDiscoveryLabel(selectedSubcategory)}
              tone="blue"
              active
            />
          </View>
          <View style={{ height: 8 }} />
          <View style={styles.miniRow}>
            <PixelText variant="caption" tone="muted">
              聚集地
            </PixelText>
            <PixelChip
              label={selectedHub?.name || "不指定"}
              tone="purple"
              active
            />
          </View>

          {/* 條件達成度 */}
          <View style={styles.divider} />
          <View style={styles.miniRow}>
            <PixelText variant="caption" tone="muted" display>
              REQUIREMENTS
            </PixelText>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <PixelChip
                label={discoveryProfile?.is_verified ? "驗證 OK" : "驗證 X"}
                tone={discoveryProfile?.is_verified ? "green" : "red"}
                active
                display
              />
              <PixelChip
                label={
                  discoveryProfile?.has_active_primary_location
                    ? "位置 OK"
                    : "位置 X"
                }
                tone={
                  discoveryProfile?.has_active_primary_location
                    ? "green"
                    : "red"
                }
                active
                display
              />
            </View>
          </View>

          {/* 展開 / 收合的編輯區 */}
          {discoveryEditing ? (
            <>
              <View style={styles.divider} />

              {/* 公開顯示 switch */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <PixelText variant="bodyLg">公開顯示</PixelText>
                  <PixelText variant="caption" tone="muted">
                    符合條件時,顧客可在公開探索找到這家店
                  </PixelText>
                </View>
                <Switch
                  value={isPublicSelected}
                  onValueChange={(v) => setIsPublicSelected(v)}
                  disabled={isSavingDiscovery}
                  trackColor={{
                    false: pixelColors.gray700,
                    true: pixelColors.green,
                  }}
                  thumbColor={pixelColors.paper}
                />
              </View>

              {discoveryListError ? (
                <>
                  <View style={{ height: 8 }} />
                  <PixelText variant="caption" tone="gold">
                    {discoveryListError}
                  </PixelText>
                </>
              ) : null}

              {/* 選擇主分類 */}
              {discoveryCategories.length > 0 ? (
                <>
                  <View style={styles.divider} />
                  <PixelText variant="caption" tone="gold" display>
                    PICK  CATEGORY
                  </PixelText>
                  <View style={{ height: 6 }} />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {discoveryCategories.map((category) => (
                      <PixelChip
                        key={category.id}
                        label={getDiscoveryLabel(category)}
                        tone="gold"
                        active={selectedCategoryId === category.id}
                        onPress={() =>
                          !isSavingDiscovery && selectCategory(category.id)
                        }
                      />
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {/* 選擇子分類 */}
              {selectedSubcategories.length > 0 ? (
                <>
                  <View style={{ height: 12 }} />
                  <PixelText variant="caption" tone="blue" display>
                    PICK  SUBCATEGORY
                  </PixelText>
                  <View style={{ height: 6 }} />
                  <View style={styles.chipWrap}>
                    {selectedSubcategories.map((subcategory) => (
                      <PixelChip
                        key={subcategory.id}
                        label={getDiscoveryLabel(subcategory)}
                        tone="blue"
                        active={selectedSubcategoryId === subcategory.id}
                        onPress={() =>
                          !isSavingDiscovery &&
                          setSelectedSubcategoryId(subcategory.id)
                        }
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {/* 選擇聚集地 */}
              {discoveryHubs.length > 0 ? (
                <>
                  <View style={{ height: 12 }} />
                  <PixelText variant="caption" tone="purple" display>
                    PICK  HUB
                  </PixelText>
                  <View style={{ height: 6 }} />
                  <View style={styles.chipWrap}>
                    <PixelChip
                      label="不指定"
                      tone="paper"
                      active={selectedHubId === null}
                      onPress={() =>
                        !isSavingDiscovery && setSelectedHubId(null)
                      }
                    />
                    {discoveryHubs.map((hub) => (
                      <PixelChip
                        key={hub.id}
                        label={hub.name}
                        tone="purple"
                        active={selectedHubId === hub.id}
                        onPress={() =>
                          !isSavingDiscovery && setSelectedHubId(hub.id)
                        }
                      />
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.divider} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <PixelButton
                    label="取消"
                    tone="paper"
                    fullWidth
                    disabled={isSavingDiscovery}
                    onPress={cancelDiscoveryEdit}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PixelButton
                    label={isSavingDiscovery ? "..." : "> 儲存"}
                    tone="blue"
                    fullWidth
                    disabled={isSavingDiscovery || isLoading}
                    onPress={() => void saveDiscoveryProfile()}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.divider} />
              <PixelButton
                label="> 編輯探索設定"
                tone="blue"
                fullWidth
                disabled={isLoading}
                onPress={() => setDiscoveryEditing(true)}
              />
            </>
          )}
        </PixelCard>

        {/* QR Code */}
        <PixelCard title="QR  CODE" titleTone="ink" titleDisplay padding={14}>
          <View style={styles.headerRow}>
            <View
              style={[styles.headerIcon, { backgroundColor: pixelColors.gold }]}
            >
              <Ionicons name="qr-code" size={18} color={pixelColors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText variant="bodyLg">我的訂閱 QR Code</PixelText>
              <PixelText variant="caption" tone="muted">
                顯示 / 匯出可列印 QR,讓顧客掃碼訂閱
              </PixelText>
            </View>
          </View>

          <View style={{ height: 12 }} />
          <Link href="/vendor/qrcode" asChild>
            <Pressable>
              <View pointerEvents="none">
                <PixelButton
                  label="> 開啟 QR Code"
                  tone="gold"
                  fullWidth
                  onPress={() => {}}
                />
              </View>
            </Pressable>
          </Link>
        </PixelCard>

        {/* 帳號資訊 */}
        <PixelCard
          title="ACCOUNT  INFO"
          titleTone="purple"
          titleDisplay
          padding={14}
        >
          <InfoRow
            label="顯示名稱"
            value={profile?.name || user?.name || "未設定"}
          />
          <View style={styles.divider} />
          <InfoRow
            label="登入帳號"
            value={profile?.email || user?.email || "未取得"}
          />
          <View style={styles.divider} />
          <InfoRow
            label="店名"
            value={merchantProfile?.store_name || "未設定"}
          />
          <View style={styles.divider} />
          <InfoRow
            label="店家描述"
            value={merchantProfile?.store_description || "尚未設定店家描述"}
          />

          <View style={{ height: 14 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <PixelButton
                label="> 品項管理"
                tone="blue"
                fullWidth
                onPress={() => router.push("/vendor/menu")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PixelButton
                label="> 位置設定"
                tone="gold"
                fullWidth
                onPress={() => router.push("/vendor/location")}
              />
            </View>
          </View>
        </PixelCard>
      </ScrollView>
    </View>
  );
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <PixelText variant="caption" tone="muted">
        {label}
      </PixelText>
      <View style={{ flex: 1 }} />
      <PixelText
        variant="body"
        style={{ textAlign: "right", maxWidth: "65%" }}
        numberOfLines={2}
      >
        {value}
      </PixelText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  hud: {
    backgroundColor: pixelColors.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: pixelBorderWidth,
    borderBottomColor: pixelColors.ink,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  // 用一條 2px 黑線當區塊分隔,取代之前的雙層 inset box
  divider: {
    height: 2,
    backgroundColor: pixelColors.ink,
    marginVertical: 12,
  },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
});

export default Profile;
