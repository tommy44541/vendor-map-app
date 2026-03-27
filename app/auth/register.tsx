import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRootNavigationState, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import PasswordStrength from "../../components/PasswordStrength";
import { useAuth } from "../../contexts/AuthContext";
import { ApiError } from "../../services/api/util";
import {
  ErrorCode,
  isErrorType,
  showErrorAlert,
} from "../../utils/errorHandler";
import {
  DEFAULT_PASSWORD_REQUIREMENTS,
  checkPasswordRequirements,
  validatePassword,
} from "../../utils/passwordValidation";
import { getPostAuthRoute } from "../../utils/onboarding";

const createValidationSchema = (isLogin: boolean) => {
  if (isLogin) {
    return z.object({
      email: z.email("請輸入有效的電子郵件地址"),
      password: z.string().min(8, "密碼至少需要8個字符"),
      name: z.string().optional(),
      confirmPassword: z.string().optional(),
      store_name: z.string().optional(),
      business_license: z.string().optional(),
    });
  } else {
    return z
      .object({
        name: z.string().min(2, "姓名至少需要2個字符"),
        email: z.email("請輸入有效的電子郵件地址"),
        password: z
          .string()
          .min(8, "密碼至少需要8個字符")
          .superRefine((password, ctx) => {
            const requirementsCheck = checkPasswordRequirements(
              password,
              DEFAULT_PASSWORD_REQUIREMENTS
            );

            if (!requirementsCheck.isValid) {
              ctx.addIssue({
                code: "custom",
                message: requirementsCheck.errorMessage || "密碼不符合要求",
              });
              return;
            }

            const validation = validatePassword(
              password,
              DEFAULT_PASSWORD_REQUIREMENTS
            );

            if (!validation.isValid) {
              ctx.addIssue({
                code: "custom",
                message: "密碼強度不足",
              });
            }
          }),
        confirmPassword: z.string().min(1, "請確認密碼"),
        store_name: z.string().optional(),
        business_license: z.string().optional(),
      })
      .refine(
        (data) => {
          if (data.password !== data.confirmPassword) {
            return false;
          }
          return true;
        },
        {
          message: "密碼確認不匹配",
          path: ["confirmPassword"],
        }
      );
  }
};

// 从schema推断类型
type RegisterFormData = z.infer<ReturnType<typeof createValidationSchema>>;

type MerchantOnboardingState = {
  onboardingToken: string;
  requiredFields: string[];
} | null;

export default function RegisterScreen() {
  const router = useRouter();
  const rootNavState = useRootNavigationState();
  const params = useLocalSearchParams<{ type: string }>();
  const type = params?.type;
  const {
    register,
    login,
    googleLogin,
    completeMerchantOnboarding,
    isLoading,
    isAuthenticated,
    user,
  } = useAuth();

  const [isLogin, setIsLogin] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [toggleContainerWidth, setToggleContainerWidth] = useState(0);
  const [merchantOnboarding, setMerchantOnboarding] =
    useState<MerchantOnboardingState>(null);
  const [merchantOnboardingValues, setMerchantOnboardingValues] = useState({
    store_name: "",
    business_license: "",
  });

  const validationSchema = useMemo(
    () => createValidationSchema(isLogin),
    [isLogin]
  );

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      name: "",
      email: "test@test.com",
      password: "P@ssword123",
      confirmPassword: "",
      store_name: "",
      business_license: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    form.clearErrors();
    form.reset({
      name: "",
      email: "test@test.com",
      password: "P@ssword123",
      confirmPassword: "",
      store_name: "",
      business_license: "",
    });
  }, [isLogin, form]);

  useEffect(() => {
    if (type !== "vendor") {
      setMerchantOnboarding(null);
      return;
    }

    setMerchantOnboardingValues({
      store_name: String(form.getValues("store_name") || ""),
      business_license: String(form.getValues("business_license") || ""),
    });
  }, [form, type]);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isLogin ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isLogin, slideAnim]);

  useEffect(() => {
    if (!rootNavState?.key) return;
    if (!isAuthenticated || !user) return;

    const run = async () => {
      const nextRoute = await getPostAuthRoute(user);
      router.replace(nextRoute);
    };

    run();
  }, [isAuthenticated, rootNavState?.key, router, user]);

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      try {
        const userType: "vendor" | "consumer" =
          type === "vendor" ? "vendor" : "consumer";

        if (isLogin) {
          await login(data.email, data.password, userType);
        } else {
          if (!data.name) {
            showErrorAlert("請輸入姓名", "驗證錯誤");
            return;
          }
          await register({
            email: data.email,
            password: data.password,
            name: data.name,
            userType: userType,
            store_name: userType === "vendor" ? data.store_name : undefined,
            business_license:
              userType === "vendor" ? data.business_license : undefined,
          });
        }
      } catch (error: any) {
        if (error instanceof ApiError && isErrorType(error, ErrorCode.UNAUTHORIZED)) {
          showErrorAlert(ErrorCode.UNAUTHORIZED);
        } else {
          showErrorAlert(error, "操作失敗");
        }
        form.reset();
      }
    },
    [isLogin, register, login, type, form]
  );

  const userTypeText = type === "vendor" ? "攤車商家" : "消費者";
  const isVendor = type === "vendor";
  const titleFont = Platform.select({
    ios: "AvenirNext-Bold",
    android: "sans-serif-condensed",
    default: undefined,
  });

  const theme = useMemo(
    () =>
      isVendor
        ? {
            background: ["#2B1207", "#7C2D12", "#9A3412"] as [
              string,
              string,
              string,
            ],
            hero: ["#FB923C", "#EA580C"] as [string, string],
            cta: ["#F97316", "#EA580C"] as [string, string],
            accent: "#EA580C",
            accentSoft: "rgba(251,146,60,0.2)",
            glow: "rgba(251,146,60,0.2)",
            outline: "rgba(255,255,255,0.28)",
          }
        : {
            background: ["#0C4A6E", "#155E75", "#0F766E"] as [
              string,
              string,
              string,
            ],
            hero: ["#22D3EE", "#0284C7"] as [string, string],
            cta: ["#0EA5E9", "#0284C7"] as [string, string],
            accent: "#0EA5E9",
            accentSoft: "rgba(34,211,238,0.22)",
            glow: "rgba(34,211,238,0.2)",
            outline: "rgba(255,255,255,0.28)",
          },
    [isVendor]
  );

  const handleGoogleLogin = useCallback(async () => {
    try {
      const userType: "vendor" | "consumer" =
        type === "vendor" ? "vendor" : "consumer";
      const result = await googleLogin(userType);
      if (result?.status === "onboarding_required" && userType === "vendor") {
        setMerchantOnboarding({
          onboardingToken: result.onboardingToken,
          requiredFields: result.requiredFields,
        });
        setMerchantOnboardingValues({
          store_name: String(form.getValues("store_name") || ""),
          business_license: String(form.getValues("business_license") || ""),
        });
      }
    } catch (error: any) {
      if (error instanceof ApiError && isErrorType(error, ErrorCode.UNAUTHORIZED)) {
        showErrorAlert(ErrorCode.UNAUTHORIZED);
      } else {
        showErrorAlert(error, "Google 登入失敗");
      }
    }
  }, [form, googleLogin, type]);

  const handleGoogleRegister = useCallback(async () => {
    try {
      const userType: "vendor" | "consumer" =
        type === "vendor" ? "vendor" : "consumer";
      const storeName = String(form.getValues("store_name") || "").trim();
      const businessLicense = String(form.getValues("business_license") || "").trim();
      const result = await googleLogin(userType, {
        forceAccountSelection: true,
        storeName: storeName || undefined,
        businessLicense: businessLicense || undefined,
      });
      if (result?.status === "onboarding_required" && userType === "vendor") {
        setMerchantOnboarding({
          onboardingToken: result.onboardingToken,
          requiredFields: result.requiredFields,
        });
        setMerchantOnboardingValues({
          store_name: String(form.getValues("store_name") || ""),
          business_license: String(form.getValues("business_license") || ""),
        });
        setIsLogin(false);
      }
    } catch (error: any) {
      if (error instanceof ApiError && isErrorType(error, ErrorCode.UNAUTHORIZED)) {
        showErrorAlert(ErrorCode.UNAUTHORIZED);
      } else {
        showErrorAlert(error, "Google 註冊失敗");
      }
    }
  }, [form, googleLogin, type]);

  const handleCompleteMerchantOnboarding = useCallback(async () => {
    const storeName = merchantOnboardingValues.store_name.trim();
    const businessLicense = merchantOnboardingValues.business_license.trim();

    if (!merchantOnboarding?.onboardingToken) {
      showErrorAlert("缺少商戶補件憑證，請重新進行 Google 驗證", "流程已失效");
      return;
    }

    if (!storeName || !businessLicense) {
      showErrorAlert("請先填寫店名與營業執照號碼", "資料不足");
      return;
    }

    try {
      await completeMerchantOnboarding({
        onboardingToken: merchantOnboarding.onboardingToken,
        storeName,
        businessLicense,
      });
      setMerchantOnboarding(null);
    } catch (error: any) {
      if (error instanceof ApiError && isErrorType(error, ErrorCode.UNAUTHORIZED)) {
        showErrorAlert(ErrorCode.UNAUTHORIZED);
      } else {
        showErrorAlert(error, "完成商戶資料失敗");
      }
    }
  }, [completeMerchantOnboarding, merchantOnboarding, merchantOnboardingValues]);

  // Toggle 容器是 p-1（4px），滑塊要在內邊距內移動，避免右側「貼邊」或不置中
  const TOGGLE_PADDING = 4;
  const toggleThumbWidth =
    toggleContainerWidth > 0
      ? (toggleContainerWidth - TOGGLE_PADDING * 2) / 2
      : 0;

  const slideLeft = useMemo(
    () =>
      slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
          TOGGLE_PADDING,
          TOGGLE_PADDING + toggleThumbWidth, // 右側起點 = 左 padding + 半寬
        ],
      }),
    [slideAnim, toggleThumbWidth]
  );

  const showStandardAuthForm = !(merchantOnboarding && type === "vendor");

  return (
    <LinearGradient colors={theme.background} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <View
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full"
        style={{ backgroundColor: theme.glow }}
      />
      <View
        className="absolute top-40 -left-20 w-60 h-60 rounded-full"
        style={{ backgroundColor: theme.glow }}
      />
      <View className="absolute top-24 right-8 w-24 h-24 rounded-3xl bg-white/10 rotate-12" />
      <View className="absolute top-72 left-6 w-16 h-16 rounded-2xl bg-white/10 -rotate-12" />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-row items-center justify-between pt-2">
              <TouchableOpacity
                className="w-11 h-11 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: "rgba(255,255,255,0.14)",
                  borderWidth: 1,
                  borderColor: theme.outline,
                }}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <View
                className="rounded-full px-3 py-1.5 flex-row items-center gap-1.5"
                style={{ backgroundColor: theme.accentSoft }}
              >
                <Ionicons
                  name={isVendor ? "storefront-outline" : "compass-outline"}
                  size={14}
                  color="#FFFFFF"
                />
                <Text
                  className="text-xs font-semibold tracking-[0.5px]"
                  style={{ color: "#FFFFFF" }}
                >
                  {userTypeText}
                </Text>
              </View>
            </View>

            <View className="pt-7 pb-10">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className="text-white text-[36px] leading-[40px]"
                    style={{ fontFamily: titleFont }}
                  >
                    {isLogin ? "登入雷達" : "加入雷達"}
                  </Text>
                  <Text className="text-white/85 text-sm leading-6 mt-2">
                    {isLogin
                      ? "登入後立即接收位置與通知更新。"
                      : `建立你的 ${userTypeText} 帳戶，快速開始使用。`}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2 mt-5">
                <View
                  className="flex-1 rounded-2xl px-3 py-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
                >
                  <Text className="text-white/70 text-[11px]">流程</Text>
                  <Text className="text-white text-sm font-semibold mt-0.5">
                    {isLogin ? "1 步完成登入" : "1 分鐘完成註冊"}
                  </Text>
                </View>
                <View
                  className="flex-1 rounded-2xl px-3 py-2"
                  style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
                >
                  <Text className="text-white/70 text-[11px]">身份</Text>
                  <Text className="text-white text-sm font-semibold mt-0.5">
                    {isVendor ? "攤商管理模式" : "消費者追蹤模式"}
                  </Text>
                </View>
              </View>
            </View>

            <View className="rounded-[30px] bg-white p-5 shadow-2xl -mt-3">
              {merchantOnboarding && type === "vendor" ? (
                <View className="mb-6 rounded-3xl border border-orange-200 bg-orange-50 p-4">
                  <View className="mb-3 self-start rounded-full bg-emerald-100 px-3 py-1">
                    <Text className="text-xs font-semibold tracking-[0.4px] text-emerald-700">
                      Google 驗證已完成
                    </Text>
                  </View>

                  <View className="flex-row items-start">
                    <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-orange-100">
                      <Ionicons name="storefront-outline" size={18} color="#C2410C" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-bold text-slate-900">
                        再完成一步，就能開始使用攤商端
                      </Text>
                      <Text className="mt-1 text-sm leading-6 text-slate-600">
                        你的 Google 帳號已驗證成功。現在只需要補上店名與攤商編號，我們就會為你建立攤商身分。
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 rounded-2xl border border-orange-100 bg-white/80 px-4 py-3">
                    <Text className="text-xs font-medium tracking-[0.3px] text-orange-700">
                      最後一步
                    </Text>
                    <Text className="mt-1 text-sm leading-6 text-slate-600">
                      這裡只需要填寫下面兩個欄位，不需要再重新填完整註冊表單。
                    </Text>
                  </View>

                  <View className="mt-4">
                    <Text className="ml-1 text-sm font-medium text-slate-700">店名</Text>
                    <TextInput
                      className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800"
                      placeholder="請輸入您的店名"
                      placeholderTextColor="#94A3B8"
                      value={merchantOnboardingValues.store_name}
                      onChangeText={(value) =>
                        setMerchantOnboardingValues((prev) => ({
                          ...prev,
                          store_name: value,
                        }))
                      }
                    />
                  </View>

                  <View className="mt-4">
                    <Text className="ml-1 text-sm font-medium text-slate-700">
                      營業執照號碼
                    </Text>
                    <TextInput
                      className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800"
                      placeholder="請輸入營業執照號碼"
                      placeholderTextColor="#94A3B8"
                      value={merchantOnboardingValues.business_license}
                      autoCapitalize="characters"
                      onChangeText={(value) =>
                        setMerchantOnboardingValues((prev) => ({
                          ...prev,
                          business_license: value,
                        }))
                      }
                    />
                  </View>

                  <TouchableOpacity
                    className="mt-5 rounded-2xl overflow-hidden"
                    onPress={handleCompleteMerchantOnboarding}
                    disabled={isLoading}
                    activeOpacity={0.92}
                  >
                    <LinearGradient
                      colors={isLoading ? ["#CBD5E1", "#CBD5E1"] : theme.cta}
                      style={{ paddingVertical: 15, alignItems: "center" }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text className="text-base font-bold tracking-[1px] text-white">
                          完成商戶設定
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : null}

              {showStandardAuthForm ? (
                <>
                  <View
                    className="bg-slate-200/70 rounded-2xl p-1 mb-7 h-14 relative justify-center border border-slate-300"
                    onLayout={(e) =>
                      setToggleContainerWidth(e.nativeEvent.layout.width)
                    }
                  >
                    <Animated.View
                      className="absolute top-1 bottom-1 rounded-xl"
                      style={{
                        left: slideLeft,
                        width: toggleThumbWidth,
                        backgroundColor: "#0F172A",
                        shadowColor: "#0F172A",
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    />
                    <View className="flex-row h-full">
                      <TouchableOpacity
                        className="flex-1 items-center justify-center z-10"
                        onPress={() => setIsLogin(false)}
                        activeOpacity={1}
                      >
                        <Text
                          className="text-base font-semibold"
                          style={{ color: !isLogin ? "#FFFFFF" : "#475569" }}
                        >
                          註冊
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 items-center justify-center z-10"
                        onPress={() => setIsLogin(true)}
                        activeOpacity={1}
                      >
                        <Text
                          className="text-base font-semibold"
                          style={{ color: isLogin ? "#FFFFFF" : "#475569" }}
                        >
                          登入
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="space-y-5">
                {!isLogin && (
                  <View className="space-y-2">
                    <Text className="text-sm font-medium text-slate-700 ml-1">
                      姓名
                    </Text>
                    <Controller
                      control={form.control}
                      name="name"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          className={`bg-slate-50 border rounded-xl px-4 py-3.5 text-base text-slate-800 ${
                            form.formState.errors.name
                              ? "border-ui-error"
                              : "border-slate-200"
                          }`}
                          placeholder="請輸入您的姓名"
                          placeholderTextColor="#94A3B8"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          autoCapitalize="words"
                          returnKeyType="next"
                        />
                      )}
                    />
                    {form.formState.errors.name && (
                      <Text className="text-red-500 text-xs ml-1">
                        {form.formState.errors.name.message}
                      </Text>
                    )}
                  </View>
                )}

                <View className="space-y-2">
                  <Text className="text-sm font-medium text-slate-700 ml-1">
                    電子郵件
                  </Text>
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className={`bg-slate-50 border rounded-xl px-4 py-3.5 text-base text-slate-800 ${
                          form.formState.errors.email
                            ? "border-ui-error"
                            : "border-slate-200"
                        }`}
                        placeholder="請輸入您的電子郵件"
                        placeholderTextColor="#94A3B8"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                      />
                    )}
                  />
                  {form.formState.errors.email && (
                    <Text className="text-red-500 text-xs ml-1">
                      {form.formState.errors.email.message}
                    </Text>
                  )}
                </View>

                <View className="space-y-2">
                  <Text className="text-sm font-medium text-slate-700 ml-1">
                    密碼
                  </Text>
                  <Controller
                    control={form.control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="relative">
                        <TextInput
                          className={`bg-slate-50 border rounded-xl px-4 py-3.5 text-base text-slate-800 pr-12 ${
                            form.formState.errors.password
                              ? "border-ui-error"
                              : "border-slate-200"
                          }`}
                          placeholder="請輸入您的密碼"
                          placeholderTextColor="#94A3B8"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          secureTextEntry={!isPasswordVisible}
                          returnKeyType="done"
                        />
                        <TouchableOpacity
                          className="absolute right-4 top-0 bottom-0 justify-center"
                          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        >
                          <Ionicons
                            name={
                              isPasswordVisible
                                ? "eye-off-outline"
                                : "eye-outline"
                            }
                            size={20}
                            color="#64748B"
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  />

                  {!isLogin && form.watch("password") && (
                    <PasswordStrength
                      password={form.watch("password")}
                      showHIBPCheck={true}
                    />
                  )}

                  {form.formState.errors.password && (
                    <Text className="text-red-500 text-xs ml-1">
                      {form.formState.errors.password.message}
                    </Text>
                  )}
                </View>

                {!isLogin && (
                  <View className="space-y-2">
                    <Text className="text-sm font-medium text-slate-700 ml-1">
                      確認密碼
                    </Text>
                    <Controller
                      control={form.control}
                      name="confirmPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View className="relative">
                          <TextInput
                            className={`bg-slate-50 border rounded-xl px-4 py-3.5 text-base text-slate-800 pr-12 ${
                              form.formState.errors.confirmPassword
                                ? "border-ui-error"
                                : "border-slate-200"
                            }`}
                            placeholder="請再次輸入密碼"
                            placeholderTextColor="#94A3B8"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            secureTextEntry={!isConfirmPasswordVisible}
                            returnKeyType="done"
                          />
                          <TouchableOpacity
                            className="absolute right-4 top-0 bottom-0 justify-center"
                            onPress={() =>
                              setIsConfirmPasswordVisible(
                                !isConfirmPasswordVisible
                              )
                            }
                          >
                            <Ionicons
                              name={
                                isConfirmPasswordVisible
                                  ? "eye-off-outline"
                                  : "eye-outline"
                              }
                              size={20}
                              color="#64748B"
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {form.formState.errors.confirmPassword && (
                      <Text className="text-red-500 text-xs ml-1">
                        {form.formState.errors.confirmPassword.message}
                      </Text>
                    )}
                  </View>
                )}

                {!isLogin && type === "vendor" && (
                  <>
                    <View className="space-y-2">
                      <Text className="text-sm font-medium text-slate-700 ml-1">
                        店名
                      </Text>
                      <Controller
                        control={form.control}
                        name="store_name"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                            className={`bg-slate-50 border rounded-xl px-4 py-3.5 text-base text-slate-800 ${
                              form.formState.errors.store_name
                                ? "border-ui-error"
                                : "border-slate-200"
                            }`}
                            placeholder="請輸入您的店名"
                            placeholderTextColor="#94A3B8"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            autoCapitalize="words"
                            returnKeyType="next"
                          />
                        )}
                      />
                      {form.formState.errors.store_name && (
                        <Text className="text-red-500 text-xs ml-1">
                          {form.formState.errors.store_name.message}
                        </Text>
                      )}
                    </View>

                    <View className="space-y-2">
                      <Text className="text-sm font-medium text-slate-700 ml-1">
                        營業執照號碼
                      </Text>
                      <Controller
                        control={form.control}
                        name="business_license"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                            className={`bg-slate-50 border rounded-xl px-4 py-3.5 text-base text-slate-800 ${
                              form.formState.errors.business_license
                                ? "border-ui-error"
                                : "border-slate-200"
                            }`}
                            placeholder="請輸入營業執照號碼"
                            placeholderTextColor="#94A3B8"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            autoCapitalize="characters"
                            returnKeyType="done"
                          />
                        )}
                      />
                      {form.formState.errors.business_license && (
                        <Text className="text-red-500 text-xs ml-1">
                          {form.formState.errors.business_license.message}
                        </Text>
                      )}
                    </View>
                  </>
                )}

                <TouchableOpacity
                  className="rounded-2xl overflow-hidden mt-5 shadow-sm"
                  onPress={form.handleSubmit(onSubmit)}
                  disabled={isLoading}
                  activeOpacity={0.92}
                >
                  <LinearGradient
                    colors={isLoading ? ["#CBD5E1", "#CBD5E1"] : theme.cta}
                    style={{
                      paddingVertical: 15,
                      alignItems: "center",
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-base font-bold tracking-[1px] text-white">
                        {isLogin ? "登入" : "註冊"}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {isLogin ? (
                  <>
                    <View className="flex-row items-center mt-5 mb-3">
                      <View className="flex-1 h-px bg-slate-200" />
                      <Text className="mx-3 text-xs text-slate-400">
                        或使用第三方登入
                      </Text>
                      <View className="flex-1 h-px bg-slate-200" />
                    </View>

                    <TouchableOpacity
                      className={`rounded-2xl py-3.5 px-4 border items-center flex-row justify-center ${
                        isLoading
                          ? "bg-gray-100 border-gray-200"
                          : "bg-white border-slate-300"
                      }`}
                      onPress={handleGoogleLogin}
                      disabled={isLoading}
                      activeOpacity={0.9}
                    >
                      {isLoading ? (
                        <ActivityIndicator />
                      ) : (
                        <>
                          <Ionicons name="logo-google" size={20} color="#DC2626" />
                          <Text className="text-base font-semibold text-slate-700 ml-2">
                            使用 Google 登入
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View className="flex-row items-center mt-5 mb-3">
                      <View className="flex-1 h-px bg-slate-200" />
                      <Text className="mx-3 text-xs text-slate-400">
                        或使用第三方註冊
                      </Text>
                      <View className="flex-1 h-px bg-slate-200" />
                    </View>

                    <TouchableOpacity
                      className={`rounded-2xl py-3.5 px-4 border items-center flex-row justify-center ${
                        isLoading
                          ? "bg-gray-100 border-gray-200"
                          : "bg-white border-slate-300"
                      }`}
                      onPress={handleGoogleRegister}
                      disabled={isLoading}
                      activeOpacity={0.9}
                    >
                      {isLoading ? (
                        <ActivityIndicator />
                      ) : (
                        <>
                          <Ionicons name="logo-google" size={20} color="#DC2626" />
                          <Text className="text-base font-semibold text-slate-700 ml-2">
                            使用 Google 註冊
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    {type === "vendor" ? (
                      <Text className="text-xs text-slate-500 mt-2 ml-1">
                        Google 驗證後若是新攤商，還需要補齊店名與營業執照資料。
                      </Text>
                    ) : null}
                  </>
                )}
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
