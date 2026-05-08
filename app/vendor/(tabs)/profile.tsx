import { useAuth } from "@/contexts/AuthContext";
import { authApi, type UserData } from "@/services/api/auth";
import { ApiError } from "@/services/api/util";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type VerificationTone = "success" | "warning";

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: VerificationTone;
}) {
  const bgClass = tone === "success" ? "bg-emerald-100" : "bg-amber-100";
  const textClass = tone === "success" ? "text-emerald-700" : "text-amber-700";

  return (
    <View className={`rounded-full px-3 py-1 ${bgClass}`}>
      <Text className={`text-xs font-semibold ${textClass}`}>{label}</Text>
    </View>
  );
}

const formatTime = (value?: string | null) => {
  if (!value) return "尚未驗證";

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

const Profile = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserData | null>(null);
  const [verificationInput, setVerificationInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authApi.getProfile();
      const nextProfile = res.data;
      setProfile(nextProfile);
      setVerificationInput(nextProfile.merchant_profile?.business_license || "");
    } catch (error: any) {
      console.error("載入商家個人資料失敗:", error);
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        Alert.alert("登入已過期", "請重新登入後再試");
        return;
      }
      Alert.alert("錯誤", error?.message || "載入商家資料失敗");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const merchantProfile = profile?.merchant_profile;
  const verificationStatus = merchantProfile?.verification_status || "unverified";
  const isVerified = verificationStatus === "verified";

  const verificationMeta = useMemo(() => {
    if (isVerified) {
      return {
        label: "已驗證",
        tone: "success" as const,
        title: "攤商身分已完成驗證",
        description: "目前這個帳號的營業執照資訊已經通過後端驗證。",
      };
    }

    return {
      label: "未驗證",
      tone: "warning" as const,
      title: "完成攤商驗證",
      description: "送出營業執照編號後，後端會將你的攤商身分標記為已驗證。",
    };
  }, [isVerified]);

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
      if (error instanceof ApiError && error.code === "TOKEN_EXPIRED") {
        Alert.alert("登入已過期", "請重新登入後再試");
        return;
      }
      Alert.alert("錯誤", error?.message || "商家驗證送出失敗");
    } finally {
      setIsSubmitting(false);
    }
  }, [loadProfile, verificationInput]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["left", "right", "bottom"]}>
      <LinearGradient
        colors={["#FF6B6B", "#FF8E53"]}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 18,
          paddingHorizontal: 16,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-extrabold text-white">個人</Text>
            <Text className="text-sm text-white/85 mt-1">
              {user?.name ? `${user.name}（攤商）` : "攤商帳號"}
            </Text>
          </View>
          <Pressable
            onPress={() => void loadProfile()}
            disabled={isLoading || isSubmitting}
            className="h-10 w-10 rounded-2xl bg-white/25 items-center justify-center"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="refresh" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, gap: 16 }}
      >
        <View className="bg-white border border-gray-200 rounded-3xl p-4">
          <View className="flex-row items-center gap-2">
            <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
              <Ionicons name="shield-checkmark-outline" size={18} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">攤商驗證</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                管理營業執照編號與驗證狀態
              </Text>
            </View>
            <Badge label={verificationMeta.label} tone={verificationMeta.tone} />
          </View>

          <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <Text className="text-base font-bold text-gray-900">
              {verificationMeta.title}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-600">
              {verificationMeta.description}
            </Text>

            <View className="mt-4 rounded-2xl bg-white px-4 py-3">
              <Text className="text-[11px] font-semibold text-gray-500">
                目前驗證時間
              </Text>
              <Text className="mt-1 text-sm text-gray-900">
                {formatTime(merchantProfile?.business_license_verified_at)}
              </Text>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 ml-1">
                營業執照編號
              </Text>
              <TextInput
                value={verificationInput}
                onChangeText={setVerificationInput}
                placeholder="請輸入營業執照編號"
                placeholderTextColor="#94A3B8"
                editable={!isSubmitting && !isVerified}
                autoCapitalize="characters"
                className={`mt-2 rounded-2xl border px-4 py-3.5 text-base ${
                  isVerified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-gray-200 bg-white text-gray-900"
                }`}
              />
            </View>

            <Pressable
              onPress={() => void submitVerification()}
              disabled={isSubmitting || isVerified}
              className={`mt-4 rounded-2xl py-3 items-center ${
                isSubmitting || isVerified ? "bg-gray-300" : "bg-gray-900"
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">
                  {isVerified ? "已完成驗證" : "送出攤商驗證"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <View className="bg-white border border-gray-200 rounded-3xl p-4">
          <View className="flex-row items-center gap-2">
            <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
              <Ionicons name="qr-code" size={18} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                我的訂閱 QR Code
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                顯示 / 匯出可列印 QR，讓顧客掃碼訂閱
              </Text>
            </View>
          </View>

          <Link href="/vendor/qrcode" asChild>
            <Pressable className="mt-4 bg-gray-900 rounded-2xl py-3 items-center">
              <Text className="text-white font-semibold">開啟 QR Code</Text>
            </Pressable>
          </Link>
        </View>

        <View className="bg-white border border-gray-200 rounded-3xl p-4">
          <Text className="text-base font-bold text-gray-900">帳號資訊</Text>
          <View className="mt-3 gap-3">
            <View className="bg-gray-50 rounded-2xl px-4 py-3">
              <Text className="text-[11px] font-semibold text-gray-500">
                顯示名稱
              </Text>
              <Text className="text-sm text-gray-900 mt-1">
                {profile?.name || user?.name || "未設定"}
              </Text>
            </View>
            <View className="bg-gray-50 rounded-2xl px-4 py-3">
              <Text className="text-[11px] font-semibold text-gray-500">
                登入帳號
              </Text>
              <Text className="text-sm text-gray-900 mt-1">
                {profile?.email || user?.email || "未取得"}
              </Text>
            </View>
            <View className="bg-gray-50 rounded-2xl px-4 py-3">
              <Text className="text-[11px] font-semibold text-gray-500">
                店名
              </Text>
              <Text className="text-sm text-gray-900 mt-1">
                {merchantProfile?.store_name || "未設定"}
              </Text>
            </View>
            <View className="bg-gray-50 rounded-2xl px-4 py-3">
              <Text className="text-[11px] font-semibold text-gray-500">
                店家描述
              </Text>
              <Text className="text-sm text-gray-900 mt-1">
                {merchantProfile?.store_description || "尚未設定店家描述"}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => router.push("/vendor/menu")}
              className="flex-1 rounded-2xl bg-gray-900 py-3 items-center"
            >
              <Text className="text-white font-semibold">菜單管理</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/vendor/location")}
              className="flex-1 rounded-2xl bg-white border border-gray-200 py-3 items-center"
            >
              <Text className="text-gray-900 font-semibold">位置設定</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
