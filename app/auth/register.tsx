import Ionicons from "@expo/vector-icons/Ionicons";
import { zodResolver } from "@hookform/resolvers/zod";
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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import PasswordStrength from "../../components/PasswordStrength";
import {
  PixelButton,
  PixelCard,
  PixelChip,
  PixelEyeToggle,
  PixelLoading,
  PixelSegmentedControl,
  PixelText,
  PixelTextInput,
} from "../../components/pixel";
import { type AuthActionResult, useAuth } from "../../contexts/AuthContext";
import { showErrorAlert } from "../../utils/errorHandler";
import {
  DEFAULT_PASSWORD_REQUIREMENTS,
  checkPasswordRequirements,
} from "../../utils/passwordValidation";
import { getPostAuthRoute } from "../../utils/onboarding";
import { pixelColors } from "../../theme/pixel";

const createValidationSchema = (isLogin: boolean, isVendor: boolean) => {
  if (isLogin) {
    return z.object({
      email: z.email("請輸入有效的電子郵件地址"),
      password: z.string().min(1, "請輸入密碼").max(128, "密碼最多128個字符"),
      name: z.string().optional(),
      confirmPassword: z.string().optional(),
      store_name: z.string().max(50, "店名最多50個字符").optional(),
    });
  }
  return z
    .object({
      name: z.string().min(2, "姓名至少需要2個字符"),
      email: z.email("請輸入有效的電子郵件地址"),
      password: z
        .string()
        .min(8, "密碼至少需要8個字符")
        .max(128, "密碼最多128個字符")
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
          }
        }),
      confirmPassword: z.string().min(1, "請確認密碼"),
      store_name: z.string().max(50, "店名最多50個字符").optional(),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: "密碼確認不匹配",
          path: ["confirmPassword"],
        });
      }
      if (isVendor && !data.store_name?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "請輸入店名",
          path: ["store_name"],
        });
      }
    });
};

type RegisterFormData = z.infer<ReturnType<typeof createValidationSchema>>;

type MerchantOnboardingState = {
  onboardingToken: string;
  requiredFields: string[];
} | null;

type AccountLinkingState = {
  linkingToken: string;
  userType: "vendor" | "consumer";
} | null;

type AuthMode = "register" | "login";

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
    linkProvider,
    isLoading,
    isAuthenticated,
    user,
  } = useAuth();
  // 只導頁一次 — user object 之後每次更新(例如個人頁 loadProfile 呼叫
  // syncUserFromApi)都會換新 reference,若不擋住會讓這個 effect 重跑。
  const hasRedirectedRef = useRef(false);

  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const isLogin = authMode === "login";
  const isVendor = type === "vendor";

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [merchantOnboarding, setMerchantOnboarding] =
    useState<MerchantOnboardingState>(null);
  const [merchantOnboardingValues, setMerchantOnboardingValues] = useState({
    store_name: "",
  });
  const [accountLinking, setAccountLinking] =
    useState<AccountLinkingState>(null);
  const [linkingPassword, setLinkingPassword] = useState("");
  const [isLinkingPasswordVisible, setIsLinkingPasswordVisible] =
    useState(false);

  const validationSchema = useMemo(
    () => createValidationSchema(isLogin, isVendor),
    [isLogin, isVendor]
  );

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      store_name: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    form.clearErrors();
    form.reset({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      store_name: "",
    });
  }, [isLogin, form]);

  useEffect(() => {
    setAccountLinking(null);
    setLinkingPassword("");
    if (type !== "vendor") {
      setMerchantOnboarding(null);
      return;
    }
    setMerchantOnboardingValues({
      store_name: String(form.getValues("store_name") || ""),
    });
  }, [form, type]);

  const capturePendingAuthResult = useCallback(
    (result: AuthActionResult | void) => {
      if (result?.status === "linking_required") {
        setMerchantOnboarding(null);
        setAccountLinking({
          linkingToken: result.linkingToken,
          userType: result.requestedRole,
        });
        setLinkingPassword("");
        return;
      }

      if (
        result?.status === "onboarding_required" &&
        result.requestedRole === "vendor"
      ) {
        setAccountLinking(null);
        setMerchantOnboarding({
          onboardingToken: result.onboardingToken,
          requiredFields: result.requiredFields,
        });
        setMerchantOnboardingValues({
          store_name: String(form.getValues("store_name") || ""),
        });
      }
    },
    [form]
  );

  useEffect(() => {
    if (!rootNavState?.key) return;
    if (hasRedirectedRef.current) return;
    if (!isAuthenticated || !user) return;
    hasRedirectedRef.current = true;
    const run = async () => {
      const nextRoute = await getPostAuthRoute(user);
      router.replace(nextRoute);
    };
    run();
  }, [isAuthenticated, rootNavState?.key, router, user]);

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      try {
        const userType: "vendor" | "consumer" = isVendor ? "vendor" : "consumer";
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
            userType,
            store_name: userType === "vendor" ? data.store_name : undefined,
          });
        }
      } catch (error: any) {
        showErrorAlert(error, "操作失敗");
      }
    },
    [isLogin, isVendor, register, login]
  );

  const handleGoogleLogin = useCallback(async () => {
    try {
      const userType: "vendor" | "consumer" = isVendor ? "vendor" : "consumer";
      const result = await googleLogin(userType);
      capturePendingAuthResult(result);
    } catch (error: any) {
      showErrorAlert(error, "Google 登入失敗");
    }
  }, [capturePendingAuthResult, googleLogin, isVendor]);

  const handleGoogleRegister = useCallback(async () => {
    try {
      const userType: "vendor" | "consumer" = isVendor ? "vendor" : "consumer";
      const storeName = String(form.getValues("store_name") || "").trim();
      const result = await googleLogin(userType, {
        forceAccountSelection: true,
        storeName: storeName || undefined,
      });
      capturePendingAuthResult(result);
      if (result?.status === "onboarding_required") {
        setAuthMode("register");
      }
    } catch (error: any) {
      showErrorAlert(error, "Google 註冊失敗");
    }
  }, [capturePendingAuthResult, form, googleLogin, isVendor]);

  const handleLinkProvider = useCallback(async () => {
    if (!accountLinking?.linkingToken) {
      showErrorAlert("帳號綁定憑證已失效，請重新進行 Google 驗證", "流程已失效");
      return;
    }
    if (!linkingPassword) {
      showErrorAlert("請輸入這個帳號原本的密碼", "需要確認身分");
      return;
    }

    try {
      const result = await linkProvider({
        linkingToken: accountLinking.linkingToken,
        password: linkingPassword,
        userType: accountLinking.userType,
      });
      setAccountLinking(null);
      setLinkingPassword("");
      capturePendingAuthResult(result);
    } catch (error) {
      showErrorAlert(error, "帳號綁定失敗");
    }
  }, [accountLinking, capturePendingAuthResult, linkProvider, linkingPassword]);

  const handleCompleteMerchantOnboarding = useCallback(async () => {
    const storeName = merchantOnboardingValues.store_name.trim();

    if (!merchantOnboarding?.onboardingToken) {
      showErrorAlert("缺少商戶補件憑證，請重新進行 Google 驗證", "流程已失效");
      return;
    }
    if (!storeName) {
      showErrorAlert("請先填寫店名", "資料不足");
      return;
    }
    if ([...storeName].length > 50) {
      showErrorAlert("店名最多 50 個字", "店名過長");
      return;
    }
    try {
      await completeMerchantOnboarding({
        onboardingToken: merchantOnboarding.onboardingToken,
        storeName,
      });
      setMerchantOnboarding(null);
    } catch (error: any) {
      showErrorAlert(error, "完成商戶資料失敗");
    }
  }, [completeMerchantOnboarding, merchantOnboarding, merchantOnboardingValues]);

  const showStandardAuthForm = !accountLinking && !(merchantOnboarding && type === "vendor");
  const roleZh = isVendor ? "商家" : "消費者";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: pixelColors.bg }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 40,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 頂部 nav */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={24} color={pixelColors.ink} />
            </Pressable>
          </View>

          {/* Hero */}
          <View style={{ gap: 6, marginTop: 4 }}>
            <PixelText variant="display">
              {isLogin ? "歡迎回來" : "建立帳號"}
            </PixelText>
            <PixelText variant="body" tone="muted">
              {isLogin
                ? "登入後繼續使用攤位雷達。"
                : `建立${roleZh}帳號，只需要一分鐘。`}
            </PixelText>
          </View>

          {accountLinking ? (
            <PixelCard title="連結既有帳號" titleTone="blue" padding={16}>
              <PixelText variant="bodyLg">這個信箱已經有帳號</PixelText>
              <View style={{ height: 8 }} />
              <PixelText variant="body" tone="muted">
                請輸入原本的密碼確認身分，完成後即可使用 Google 登入。
              </PixelText>
              <View style={{ height: 16 }} />
              <PixelTextInput
                label="原帳號密碼"
                placeholder="請輸入密碼"
                value={linkingPassword}
                onChangeText={setLinkingPassword}
                secureTextEntry={!isLinkingPasswordVisible}
                maxLength={128}
                rightAdornment={
                  <PixelEyeToggle
                    visible={isLinkingPasswordVisible}
                    onPress={() => setIsLinkingPasswordVisible((value) => !value)}
                  />
                }
              />
              <View style={{ height: 16 }} />
              <PixelButton
                label={isLoading ? "連結中" : "連結並登入"}
                tone="green"
                fullWidth
                disabled={isLoading}
                onPress={handleLinkProvider}
              />
              <View style={{ height: 8 }} />
              <PixelButton
                label="取消"
                tone="paper"
                fullWidth
                disabled={isLoading}
                onPress={() => {
                  setAccountLinking(null);
                  setLinkingPassword("");
                }}
              />
            </PixelCard>
          ) : null}

          {/* Merchant onboarding(Google 註冊後仍缺資料) */}
          {merchantOnboarding && type === "vendor" ? (
            <PixelCard title="商家資料設定" titleTone="gold" padding={16}>
              <PixelChip label="Google 已驗證" tone="green" active />
              <View style={{ height: 12 }} />
              <PixelText variant="bodyLg">再完成一步，即可進入商家後台</PixelText>
              <View style={{ height: 8 }} />
              <PixelText variant="body" tone="muted">
                Google 驗證已通過。補上店名，就能建立商家身分。
              </PixelText>
              <View style={{ height: 16 }} />

              <View style={{ gap: 14 }}>
                <PixelTextInput
                  label="店名"
                  placeholder="請輸入您的店名"
                  value={merchantOnboardingValues.store_name}
                  maxLength={50}
                  onChangeText={(value) =>
                    setMerchantOnboardingValues((prev) => ({
                      ...prev,
                      store_name: value,
                    }))
                  }
                />
              </View>

              <View style={{ height: 16 }} />
              <PixelButton
                label={isLoading ? "儲存中" : "完成設定"}
                tone="purple"
                fullWidth
                disabled={isLoading}
                onPress={handleCompleteMerchantOnboarding}
              />
              {isLoading ? (
                <View style={{ marginTop: 10, alignItems: "center" }}>
                  <PixelLoading label="" size="sm" tone="gold" />
                </View>
              ) : null}
            </PixelCard>
          ) : null}

          {/* 一般註冊/登入表單 */}
          {showStandardAuthForm ? (
            <PixelCard
              title={isLogin ? "登入" : "註冊"}
              titleTone={isLogin ? "blue" : "red"}
              padding={16}
            >
              <PixelSegmentedControl
                value={authMode}
                onChange={setAuthMode}
                options={[
                  { value: "register", label: "註冊" },
                  { value: "login", label: "登入" },
                ]}
              />

              <View style={{ height: 18 }} />

              <View style={{ gap: 14 }}>
                {!isLogin && (
                  <Controller
                    control={form.control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <PixelTextInput
                        label="姓名"
                        placeholder="請輸入您的姓名"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                        returnKeyType="next"
                        error={form.formState.errors.name?.message as string | undefined}
                      />
                    )}
                  />
                )}

                <Controller
                  control={form.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <PixelTextInput
                      label="電子郵件"
                      placeholder="email@example.com"
                      value={value}
                      onChangeText={onChange}
                      maxLength={128}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                      error={form.formState.errors.email?.message as string | undefined}
                    />
                  )}
                />

                <Controller
                  control={form.control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <PixelTextInput
                      label="密碼"
                      placeholder="********"
                      value={value}
                      onChangeText={onChange}
                      maxLength={128}
                      onBlur={onBlur}
                      secureTextEntry={!isPasswordVisible}
                      returnKeyType="done"
                      rightAdornment={
                        <PixelEyeToggle
                          visible={isPasswordVisible}
                          onPress={() => setIsPasswordVisible((v) => !v)}
                        />
                      }
                      error={form.formState.errors.password?.message as string | undefined}
                    />
                  )}
                />

                {!isLogin && form.watch("password") ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: pixelColors.borderSoft,
                      borderRadius: 8,
                      backgroundColor: pixelColors.surfaceAlt,
                      padding: 10,
                    }}
                  >
                    <PasswordStrength
                      password={form.watch("password")}
                      showHIBPCheck={true}
                    />
                  </View>
                ) : null}

                {!isLogin && (
                  <Controller
                    control={form.control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <PixelTextInput
                        label="確認密碼"
                        placeholder="再次輸入密碼"
                        value={value}
                        onChangeText={onChange}
                        maxLength={128}
                        onBlur={onBlur}
                        secureTextEntry={!isConfirmPasswordVisible}
                        returnKeyType="done"
                        rightAdornment={
                          <PixelEyeToggle
                            visible={isConfirmPasswordVisible}
                            onPress={() =>
                              setIsConfirmPasswordVisible((v) => !v)
                            }
                          />
                        }
                        error={
                          form.formState.errors.confirmPassword?.message as
                            | string
                            | undefined
                        }
                      />
                    )}
                  />
                )}

                {!isLogin && isVendor && (
                  <>
                    <Controller
                      control={form.control}
                      name="store_name"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <PixelTextInput
                          label="店名"
                          placeholder="請輸入您的店名"
                          value={value}
                          onChangeText={onChange}
                          maxLength={50}
                          onBlur={onBlur}
                          autoCapitalize="words"
                          returnKeyType="next"
                          error={
                            form.formState.errors.store_name?.message as
                              | string
                              | undefined
                          }
                        />
                      )}
                    />
                  </>
                )}
              </View>

              <View style={{ height: 18 }} />

              <PixelButton
                label={isLoading ? "處理中" : isLogin ? "登入" : "註冊"}
                icon={isLogin ? "log-in-outline" : "person-add-outline"}
                tone={isVendor ? "red" : "blue"}
                size="lg"
                fullWidth
                disabled={isLoading}
                onPress={form.handleSubmit(onSubmit)}
              />
              {isLoading ? (
                <View style={{ marginTop: 10, alignItems: "center" }}>
                  <PixelLoading label="" size="sm" tone="gold" />
                </View>
              ) : null}

              {/* 分隔線 */}
              <View
                style={{
                  marginTop: 18,
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: pixelColors.borderSoft,
                  }}
                />
                <PixelText variant="caption" tone="muted" display>
                  或
                </PixelText>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: pixelColors.borderSoft,
                  }}
                />
              </View>

              <GoogleAuthButton
                disabled={isLoading}
                label={isLogin ? "使用 Google 登入" : "使用 Google 註冊"}
                onPress={isLogin ? handleGoogleLogin : handleGoogleRegister}
              />

              {!isLogin && isVendor ? (
                <PixelText
                  variant="caption"
                  tone="muted"
                  style={{ marginTop: 10 }}
                >
                  Google 驗證後若是新商家，需要再補齊店名；營業驗證可在商家個人頁完成。
                </PixelText>
              ) : null}
            </PixelCard>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GoogleAuthButton({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <PixelButton
      label={label}
      icon="logo-google"
      tone="paper"
      fullWidth
      disabled={disabled}
      onPress={onPress}
    />
  );
}
