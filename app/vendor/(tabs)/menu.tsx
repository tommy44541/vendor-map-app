import { styles } from "@/styles/vendor/menu.styles";
import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelLoading,
  PixelText,
  PixelTextInput,
} from "@/components/pixel";
import { MenuItem, menuApi } from "@/services/api/menu";
import { discoveryApi } from "@/services/api/discovery";
import { ApiError } from "@/services/api/util";
import { pixelColors } from "@/theme/pixel";
import { discoverySubLabel } from "@/utils/discovery/labels";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// 分類選項用 uuid 對應後端,slug 保留供 label 翻譯,label 供 UI 顯示
type CategoryOption = { id: string; slug: string; label: string };

// "all" = 篩選 chip 顯示全部;其他是 discovery_subcategories.id (uuid)
type CategoryFilter = "all" | string;

type MenuFormState = {
  name: string;
  categoryId: string;  // discovery_subcategories.id (uuid)
  price: string;
  description: string;
  prepMinutes: string;
  isPopular: boolean;
  isAvailable: boolean;
};

const DEFAULT_FORM: MenuFormState = {
  name: "",
  categoryId: "",
  price: "",
  description: "",
  prepMinutes: "5",
  isPopular: false,
  isAvailable: true,
};

const VendorMenuScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [categoriesLoadError, setCategoriesLoadError] = useState(false);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuFormState>(DEFAULT_FORM);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  // 從 discovery_subcategories 拿分類選項。後端 menu_items.category_id 是 uuid FK,
  // 失敗的話前端 UI 沒得選 → disable 新增按鈕,提示「分類載入失敗,請重試」。
  useEffect(() => {
    let cancelled = false;
    discoveryApi
      .listSubcategories()
      .then((res) => {
        if (cancelled) return;
        const subs = Array.isArray(res.data?.subcategories)
          ? res.data.subcategories
          : [];
        const active = subs
          .filter((s) => s.status !== "inactive")
          .sort((a, b) => a.display_order - b.display_order)
          .map((s) => ({
            id: s.id,
            slug: s.slug,
            label: discoverySubLabel({ slug: s.slug, name: s.name }),
          }));
        setCategoryOptions(active);
        setCategoriesLoadError(active.length === 0);
      })
      .catch(() => {
        if (cancelled) return;
        setCategoriesLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 篩選列加「全部」在最前
  const filterChips = useMemo(
    () =>
      [{ id: "all" as CategoryFilter, label: "全部" }, ...categoryOptions],
    [categoryOptions]
  );

  // item 上顯示 chip 用。category_id null(舊資料)/找不到對應的 fallback 標籤。
  const categoryLabel = useCallback(
    (categoryId?: string | null) => {
      if (!categoryId) return "未分類";
      return categoryOptions.find((c) => c.id === categoryId)?.label ?? "未分類";
    },
    [categoryOptions]
  );

  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return menuItems;
    return menuItems.filter((item) => item.category_id === selectedCategory);
  }, [menuItems, selectedCategory]);

  const stats = useMemo(() => {
    const available = menuItems.filter((item) => item.is_available).length;
    return {
      total: menuItems.length,
      available,
      hidden: menuItems.length - available,
    };
  }, [menuItems]);

  const handleApiError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        return;
      }
      const message =
        error instanceof ApiError
          ? error.message
          : (error as any)?.message || fallbackMessage;
      Alert.alert("錯誤", message);
    },
    []
  );

  const loadMenuItems = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const res = await menuApi.getMerchantMenuItems({
          page: 1,
          page_size: 100,
        });
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setMenuItems(items);
      } catch (error) {
        handleApiError(error, "取得品項失敗");
      } finally {
        if (!silent) setLoading(false);
        setInitialLoaded(true);
      }
    },
    [handleApiError]
  );

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const openCreateEditor = () => {
    if (categoryOptions.length === 0) {
      Alert.alert("無法新增品項", "分類選項尚未載入,請稍後重試");
      return;
    }
    setEditingId(null);
    // 用第一個可用 category 當預設
    setForm({
      ...DEFAULT_FORM,
      categoryId: categoryOptions[0].id,
    });
    setEditorVisible(true);
  };

  const openEditEditor = (item: MenuItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      // 舊資料 category_id 可能 null → 預設用第一個 option,商家編輯時要重新挑
      categoryId: item.category_id ?? categoryOptions[0]?.id ?? "",
      price: String(item.price),
      description: item.description || "",
      prepMinutes: String(item.prep_minutes),
      isPopular: item.is_popular,
      isAvailable: item.is_available,
    });
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingId(null);
  };

  const updateForm = <K extends keyof MenuFormState>(
    key: K,
    value: MenuFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitEditor = async () => {
    const name = form.name.trim();
    const description = form.description.trim();
    const price = Number(form.price);
    const prepMinutes = Number(form.prepMinutes);

    if (!name) {
      Alert.alert("請輸入品項名稱");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert("價格格式錯誤", "請輸入大於 0 的價格");
      return;
    }

    if (!Number.isFinite(prepMinutes) || prepMinutes <= 0) {
      Alert.alert("準備時間格式錯誤", "請輸入大於 0 的分鐘數");
      return;
    }

    if (!form.categoryId) {
      Alert.alert("請選擇分類");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name,
        description: description || null,
        category_id: form.categoryId,
        price: Math.round(price),
        currency: "TWD",
        prep_minutes: Math.round(prepMinutes),
        is_available: form.isAvailable,
        is_popular: form.isPopular,
        image_url: null,
        external_url: null,
      };

      if (editingId) {
        await menuApi.updateMenuItem(editingId, payload);
      } else {
        await menuApi.createMenuItem(payload);
      }

      closeEditor();
      await loadMenuItems(true);
    } catch (error) {
      handleApiError(error, editingId ? "更新品項失敗" : "新增品項失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      setSubmitting(true);
      await menuApi.updateMenuItemStatus(item.id, !item.is_available);
      await loadMenuItems(true);
    } catch (error) {
      handleApiError(error, "更新上下架狀態失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteItem = (item: MenuItem) => {
    Alert.alert("刪除品項", `確定要刪除「${item.name}」嗎?`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          try {
            setSubmitting(true);
            await menuApi.deleteMenuItem(item.id);
            await loadMenuItems(true);
          } catch (error) {
            handleApiError(error, "刪除品項失敗");
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={styles.hudTop}>
          <View style={{ flex: 1 }}>
            <PixelText variant="display">品項管理</PixelText>
            <View style={{ height: 4 }} />
            <PixelText variant="caption" tone="muted">
              管理上架品項與價格
            </PixelText>
          </View>
          <View style={{ gap: 6 }}>
            <PixelButton
              label={loading ? "..." : ">> 重新整理"}
              tone="paper"
              size="sm"
              disabled={loading || submitting}
              onPress={() => loadMenuItems()}
            />
            <PixelButton
              label="+ 新增"
              tone="gold"
              size="sm"
              disabled={loading || submitting || categoriesLoadError}
              onPress={openCreateEditor}
            />
          </View>
        </View>

        <View style={{ height: 12 }} />
        {categoriesLoadError ? (
          <PixelText variant="caption" tone="red">
            分類載入失敗，暫時無法新增品項
          </PixelText>
        ) : null}
        {categoriesLoadError ? <View style={{ height: 8 }} /> : null}
        <View style={styles.statRow}>
          <StatBox label="總品項" value={String(stats.total)} tone="blue" />
          <StatBox
            label="上架"
            value={String(stats.available)}
            tone="green"
          />
          <StatBox label="下架" value={String(stats.hidden)} tone="gold" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* 分類 chip 列 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 6,
            paddingHorizontal: 16,
            paddingTop: 14,
          }}
        >
          {filterChips.map((category) => (
            <PixelChip
              key={category.id}
              label={category.label}
              tone="gold"
              active={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
            />
          ))}
        </ScrollView>

        {/* 品項列表 */}
        <View style={{ paddingHorizontal: 16, marginTop: 14, gap: 10 }}>
          {!initialLoaded && loading ? (
            <PixelCard padding={20}>
              <View style={{ alignItems: "center", gap: 10 }}>
                <PixelLoading label="" size="sm" tone="gold" />
                <PixelText variant="body" tone="muted">
                  載入品項中...
                </PixelText>
              </View>
            </PixelCard>
          ) : filteredItems.length === 0 ? (
            <PixelCard padding={16}>
              <View style={{ alignItems: "center", gap: 8 }}>
                <Ionicons
                  name="restaurant-outline"
                  size={28}
                  color={pixelColors.gold}
                />
                <PixelText variant="bodyLg">此分類目前沒有品項</PixelText>
                <PixelText variant="caption" tone="muted">
                  切換分類或新增第一個品項
                </PixelText>
                <View style={{ height: 4 }} />
                <PixelButton
                  label="+ 新增第一個品項"
                  tone="gold"
                  onPress={openCreateEditor}
                />
              </View>
            </PixelCard>
          ) : (
            filteredItems.map((item) => (
              <PixelCard key={item.id} padding={12}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemTitleRow}>
                      <PixelText variant="bodyLg">{item.name}</PixelText>
                      <PixelChip
                        label={categoryLabel(item.category_id)}
                        tone="paper"
                        active
                      />
                      {item.is_popular ? (
                        <PixelChip label="熱門" tone="red" active />
                      ) : null}
                    </View>
                    <View style={{ height: 6 }} />
                    <PixelText variant="body" tone="muted">
                      {item.description?.trim() || "尚無描述"}
                    </PixelText>
                  </View>
                  <View style={styles.priceBox}>
                    <PixelText variant="title" tone="gold" display>
                      ${item.price}
                    </PixelText>
                  </View>
                </View>

                <View style={{ height: 10 }} />
                <View style={styles.itemActionsRow}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 6,
                      flexWrap: "wrap",
                      flex: 1,
                    }}
                  >
                    <PixelChip
                      label={`準備 ${item.prep_minutes} 分`}
                      tone="paper"
                      active
                    />
                    <PixelChip
                      label={item.is_available ? "上架中" : "已下架"}
                      tone={item.is_available ? "green" : "gold"}
                      active
                    />
                  </View>
                </View>

                <View style={{ height: 10 }} />
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View style={{ flex: 1 }}>
                    <PixelButton
                      label="編輯"
                      tone="paper"
                      size="sm"
                      fullWidth
                      disabled={submitting}
                      onPress={() => openEditEditor(item)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelButton
                      label={item.is_available ? "下架" : "上架"}
                      tone={item.is_available ? "ink" : "green"}
                      size="sm"
                      fullWidth
                      disabled={submitting}
                      onPress={() => toggleAvailability(item)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelButton
                      label="x 刪除"
                      tone="red"
                      size="sm"
                      fullWidth
                      disabled={submitting}
                      onPress={() => deleteItem(item)}
                    />
                  </View>
                </View>
              </PixelCard>
            ))
          )}
        </View>
      </ScrollView>

      {/* Editor Modal */}
      <Modal
        visible={editorVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={{ width: "100%" }}>
            <PixelCard
              title={editingId ? "編輯品項" : "新增品項"}
              titleTone={editingId ? "blue" : "gold"}
              padding={0}
              style={styles.modalCard}
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  paddingBottom: insets.bottom + 12,
                  maxHeight: Dimensions.get("window").height * 0.78,
                }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
                >
                  <PixelTextInput
                    label="品項名稱"
                    placeholder="例如:炙燒牛肉飯"
                    value={form.name}
                    onChangeText={(v) => updateForm("name", v)}
                  />

                  <View>
                    <PixelText variant="caption" tone="muted">
                      分類
                    </PixelText>
                    <View style={{ height: 6 }} />
                    <View style={styles.chipWrap}>
                      {categoryOptions.map((category) => (
                        <PixelChip
                          key={category.id}
                          label={category.label}
                          tone="gold"
                          active={form.categoryId === category.id}
                          onPress={() => updateForm("categoryId", category.id)}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <PixelTextInput
                        label="價格"
                        placeholder="120"
                        value={form.price}
                        onChangeText={(v) => updateForm("price", v)}
                        keyboardType={
                          Platform.OS === "ios" ? "decimal-pad" : "numeric"
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PixelTextInput
                        label="準備分鐘"
                        placeholder="8"
                        value={form.prepMinutes}
                        onChangeText={(v) => updateForm("prepMinutes", v)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <PixelTextInput
                    label="描述"
                    placeholder="簡短描述口味、配料或特色"
                    value={form.description}
                    onChangeText={(v) => updateForm("description", v)}
                    multiline
                    style={{ minHeight: 88 }}
                  />

                  <View>
                    <PixelText variant="caption" tone="muted">
                      標籤
                    </PixelText>
                    <View style={{ height: 6 }} />
                    <View style={styles.chipWrap}>
                      <PixelChip
                        label="熱門推薦"
                        tone="red"
                        active={form.isPopular}
                        onPress={() => updateForm("isPopular", !form.isPopular)}
                      />
                      <PixelChip
                        label={form.isAvailable ? "上架中" : "已下架"}
                        tone={form.isAvailable ? "green" : "gold"}
                        active
                        onPress={() =>
                          updateForm("isAvailable", !form.isAvailable)
                        }
                      />
                    </View>
                  </View>
                </ScrollView>

                <View style={{ flexDirection: "row", gap: 8, paddingTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <PixelButton
                      label="取消"
                      tone="paper"
                      fullWidth
                      disabled={submitting}
                      onPress={closeEditor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelButton
                      label={
                        submitting
                          ? "..."
                          : editingId
                            ? "> 儲存變更"
                            : "> 新增品項"
                      }
                      tone={editingId ? "blue" : "gold"}
                      fullWidth
                      disabled={submitting}
                      onPress={submitEditor}
                    />
                  </View>
                </View>
              </View>
            </PixelCard>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "gold";
}) {
  const accent =
    tone === "blue"
      ? pixelColors.blue
      : tone === "green"
        ? pixelColors.green
        : pixelColors.gold;
  return (
    <View style={[styles.statBox, { borderTopColor: accent }]}>
      <PixelText variant="caption" tone="muted">
        {label}
      </PixelText>
      <View style={{ height: 2 }} />
      <PixelText variant="bodyLg">{value}</PixelText>
    </View>
  );
}

export default VendorMenuScreen;
