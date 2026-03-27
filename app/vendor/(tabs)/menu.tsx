import { MenuCategory, MenuItem, menuApi } from "@/services/api/menu";
import { ApiError } from "@/services/api/util";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
  { id: "main", label: "主食" },
  { id: "snack", label: "小點" },
  { id: "drink", label: "飲品" },
  { id: "dessert", label: "甜點" },
];

const CATEGORY_NAME: Record<MenuCategory, string> = {
  main: "主食",
  snack: "小點",
  drink: "飲品",
  dessert: "甜點",
};

const MENU_CATEGORY_OPTIONS: { id: MenuCategory; label: string }[] = [
  { id: "main", label: "主食" },
  { id: "snack", label: "小點" },
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

  const handleApiError = useCallback((error: unknown, fallbackMessage: string) => {
    if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
      Alert.alert("登入已過期", "請重新登入後再試");
      return;
    }
    const message =
      error instanceof ApiError ? error.message : (error as any)?.message || fallbackMessage;
    Alert.alert("錯誤", message);
  }, []);

  const loadMenuItems = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const res = await menuApi.getMerchantMenuItems({ page: 1, page_size: 100 });
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setMenuItems(items);
      } catch (error) {
        handleApiError(error, "取得菜單失敗");
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
      Alert.alert("備餐時間格式錯誤", "請輸入大於 0 的分鐘數");
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
    Alert.alert("刪除品項", `確定要刪除「${item.name}」嗎？`, [
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={["left", "right", "bottom"]}>
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#334155"]}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-white text-[28px] font-extrabold">菜單管理</Text>
            <Text className="text-white/80 text-sm mt-1">管理您的菜單品項</Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => loadMenuItems()}
              disabled={loading || submitting}
              className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center"
            >
              <Ionicons name="refresh" size={18} color="#fff" />
            </Pressable>
            <Pressable
              onPress={openCreateEditor}
              disabled={loading || submitting}
              className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center"
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View className="mt-4 flex-row gap-2">
          <View className="flex-1 rounded-2xl bg-white/15 px-3 py-2.5">
            <Text className="text-white/75 text-[11px]">總品項</Text>
            <Text className="text-white text-xl font-bold mt-0.5">{stats.total}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-emerald-400/20 px-3 py-2.5">
            <Text className="text-emerald-100 text-[11px]">上架中</Text>
            <Text className="text-emerald-50 text-xl font-bold mt-0.5">{stats.available}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-amber-400/20 px-3 py-2.5">
            <Text className="text-amber-100 text-[11px]">已下架</Text>
            <Text className="text-amber-50 text-xl font-bold mt-0.5">{stats.hidden}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-4 pt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          >
            {CATEGORY_OPTIONS.map((category) => {
              const active = selectedCategory === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full border ${
                    active
                      ? "bg-slate-900 border-slate-900"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View className="px-4 mt-4 gap-3">
          {!initialLoaded && loading ? (
            <View className="bg-white border border-slate-200 rounded-2xl p-6 items-center">
              <Text className="text-slate-600">載入菜單中...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View className="bg-white border border-slate-200 rounded-2xl p-5 items-center">
              <Ionicons name="restaurant-outline" size={20} color="#94A3B8" />
              <Text className="text-slate-700 font-semibold mt-2">此分類目前沒有品項</Text>
              <Text className="text-xs text-slate-500 mt-1">請切換分類或新增品項</Text>
              <Pressable
                onPress={openCreateEditor}
                className="mt-4 bg-slate-900 px-4 py-2.5 rounded-xl"
              >
                <Text className="text-white text-xs font-semibold">新增第一個品項</Text>
              </Pressable>
            </View>
          ) : (
            filteredItems.map((item) => (
              <View
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center flex-wrap gap-2">
                      <Text className="text-base font-bold text-slate-900">{item.name}</Text>
                      <View className="bg-slate-100 px-2 py-1 rounded-full">
                        <Text className="text-[11px] font-semibold text-slate-600">
                          {CATEGORY_NAME[item.category]}
                        </Text>
                      </View>
                      {item.is_popular ? (
                        <View className="bg-rose-100 px-2 py-1 rounded-full">
                          <Text className="text-[11px] font-semibold text-rose-600">熱門</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-slate-600 text-sm mt-2 leading-5">
                      {item.description?.trim() || "尚無描述"}
                    </Text>
                  </View>
                  <Text className="text-lg font-extrabold text-slate-900">${item.price}</Text>
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-slate-100 px-2.5 py-1 rounded-full">
                      <Text className="text-[11px] font-semibold text-slate-700">
                        備餐 {item.prep_minutes} 分鐘
                      </Text>
                    </View>
                    <View
                      className={`px-2.5 py-1 rounded-full ${
                        item.is_available ? "bg-emerald-100" : "bg-amber-100"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-semibold ${
                          item.is_available ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {item.is_available ? "上架中" : "已下架"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => openEditEditor(item)}
                      disabled={submitting}
                      className="px-3 py-2 rounded-xl bg-slate-200"
                    >
                      <Text className="text-slate-800 text-xs font-semibold">編輯</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleAvailability(item)}
                      disabled={submitting}
                      className={`px-3 py-2 rounded-xl ${
                        item.is_available ? "bg-slate-800" : "bg-emerald-600"
                      }`}
                    >
                      <Text className="text-white text-xs font-semibold">
                        {item.is_available ? "設為下架" : "重新上架"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => deleteItem(item)}
                      disabled={submitting}
                      className="px-3 py-2 rounded-xl bg-rose-600"
                    >
                      <Text className="text-white text-xs font-semibold">刪除</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={editorVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEditor}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View
              className="bg-white rounded-t-3xl px-5 pt-4"
              style={{ maxHeight: "88%", paddingBottom: insets.bottom + 14 }}
            >
              <View className="flex-row items-center justify-between pb-3">
                <Text className="text-lg font-bold text-slate-900">
                  {editingId ? "編輯品項" : "新增品項"}
                </Text>
                <Pressable
                  onPress={closeEditor}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Ionicons name="close" size={18} color="#334155" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                <View className="mb-4">
                  <Text className="text-xs font-semibold text-slate-600 mb-1.5">品項名稱</Text>
                  <TextInput
                    value={form.name}
                    onChangeText={(v) => updateForm("name", v)}
                    placeholder="例如：炙燒牛肉飯"
                    className="border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-xs font-semibold text-slate-600 mb-1.5">分類</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {MENU_CATEGORY_OPTIONS.map((category) => {
                      const active = form.category === category.id;
                      return (
                        <Pressable
                          key={category.id}
                          onPress={() => updateForm("category", category.id)}
                          className={`px-3.5 py-2 rounded-full border ${
                            active
                              ? "bg-slate-900 border-slate-900"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              active ? "text-white" : "text-slate-700"
                            }`}
                          >
                            {category.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-slate-600 mb-1.5">價格</Text>
                    <TextInput
                      value={form.price}
                      onChangeText={(v) => updateForm("price", v)}
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      placeholder="120"
                      className="border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-slate-600 mb-1.5">
                      備餐分鐘
                    </Text>
                    <TextInput
                      value={form.prepMinutes}
                      onChangeText={(v) => updateForm("prepMinutes", v)}
                      keyboardType="numeric"
                      placeholder="8"
                      className="border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-xs font-semibold text-slate-600 mb-1.5">描述</Text>
                  <TextInput
                    value={form.description}
                    onChangeText={(v) => updateForm("description", v)}
                    placeholder="簡短描述口味、配料或特色"
                    multiline
                    textAlignVertical="top"
                    className="border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 min-h-[96px]"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-xs font-semibold text-slate-600 mb-1.5">標記</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => updateForm("isPopular", !form.isPopular)}
                      className={`px-3.5 py-2 rounded-full border ${
                        form.isPopular
                          ? "bg-rose-600 border-rose-600"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          form.isPopular ? "text-white" : "text-slate-700"
                        }`}
                      >
                        熱門推薦
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => updateForm("isAvailable", !form.isAvailable)}
                      className={`px-3.5 py-2 rounded-full border ${
                        form.isAvailable
                          ? "bg-emerald-600 border-emerald-600"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          form.isAvailable ? "text-white" : "text-slate-700"
                        }`}
                      >
                        {form.isAvailable ? "上架中" : "已下架"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>

              <View className="pt-3 border-t border-slate-200">
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={closeEditor}
                    className="flex-1 rounded-xl bg-slate-200 py-3 items-center"
                    disabled={submitting}
                  >
                    <Text className="text-slate-700 font-semibold">取消</Text>
                  </Pressable>
                  <Pressable
                    onPress={submitEditor}
                    className="flex-1 rounded-xl bg-slate-900 py-3 items-center"
                    disabled={submitting}
                  >
                    <Text className="text-white font-semibold">
                      {editingId ? "儲存變更" : "新增品項"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default VendorMenuScreen;
