import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelText,
  PixelTextInput,
} from "@/components/pixel";
import { MenuCategory, MenuItem, menuApi } from "@/services/api/menu";
import { ApiError } from "@/services/api/util";
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CategoryId = "all" | MenuCategory;

type MenuFormState = {
  name: string;
  category: MenuCategory;
  price: string;
  description: string;
  prepMinutes: string;
  isPopular: boolean;
  isAvailable: boolean;
};

const CATEGORY_OPTIONS: { id: CategoryId; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "main", label: "主打" },
  { id: "snack", label: "小品" },
  { id: "drink", label: "飲品" },
  { id: "dessert", label: "甜點" },
];

const CATEGORY_NAME: Record<MenuCategory, string> = {
  main: "主打",
  snack: "小品",
  drink: "飲品",
  dessert: "甜點",
};

const MENU_CATEGORY_OPTIONS: { id: MenuCategory; label: string }[] = [
  { id: "main", label: "主打" },
  { id: "snack", label: "小品" },
  { id: "drink", label: "飲品" },
  { id: "dessert", label: "甜點" },
];

const DEFAULT_FORM: MenuFormState = {
  name: "",
  category: "main",
  price: "",
  description: "",
  prepMinutes: "5",
  isPopular: false,
  isAvailable: true,
};

const VendorMenuScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

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

  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return menuItems;
    return menuItems.filter((item) => item.category === selectedCategory);
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
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setEditorVisible(true);
  };

  const openEditEditor = (item: MenuItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
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

    try {
      setSubmitting(true);

      const payload = {
        name,
        description: description || null,
        category: form.category,
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
            <PixelText variant="caption" tone="blue" display>
              MENU  MANAGER
            </PixelText>
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
              display
              disabled={loading || submitting}
              onPress={openCreateEditor}
            />
          </View>
        </View>

        <View style={{ height: 12 }} />
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
        contentContainerStyle={{ paddingBottom: 120 }}
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
          {CATEGORY_OPTIONS.map((category) => (
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
                <ActivityIndicator color={pixelColors.gold} />
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
                        label={CATEGORY_NAME[item.category]}
                        tone="paper"
                        active
                      />
                      {item.is_popular ? (
                        <PixelChip label="HOT" tone="red" active display />
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
              title={editingId ? "EDIT  ITEM" : "NEW  ITEM"}
              titleTone={editingId ? "blue" : "gold"}
              titleDisplay
              padding={0}
              style={styles.modalCard}
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  paddingBottom: insets.bottom + 12,
                  maxHeight: "85%" as any,
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
                    <PixelText variant="caption" tone="muted" display>
                      CATEGORY
                    </PixelText>
                    <View style={{ height: 6 }} />
                    <View style={styles.chipWrap}>
                      {MENU_CATEGORY_OPTIONS.map((category) => (
                        <PixelChip
                          key={category.id}
                          label={category.label}
                          tone="gold"
                          active={form.category === category.id}
                          onPress={() => updateForm("category", category.id)}
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
                    <PixelText variant="caption" tone="muted" display>
                      TAGS
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

                <View style={{ flexDirection: "row", gap: 8 }}>
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
  },
  hudTop: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    borderTopWidth: 6,
    backgroundColor: pixelColors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  priceBox: {
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    backgroundColor: pixelColors.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  itemActionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});

export default VendorMenuScreen;
