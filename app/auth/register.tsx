import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRootNavigationState, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
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
import { pixelColors } from "../../theme/pixel";

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
  }
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
            ctx.addIssue({ code: "custom", message: "密碼強度不足" });
          }
        }),
      confirmPassword: z.string().min(1, "請確認密碼"),
      store_name: z.string().optional(),
      business_license: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "密碼確認不匹配",
      path: ["confirmPassword"],
    });
};

type RegisterFormData = z.infer<ReturnType<typeof createValidationSchema>>;

type MerchantOnboardingState = {
  onboardingToken: string;
  requiredFields: string[];
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
    isLoading,
    isAuthenticated,
    user,
  } = useAuth();

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
            business_license:
              userType === "vendor" ? data.business_license : undefined,
          });
        }
      } catch (error: any) {
        if (
          error instanceof ApiError &&
          isErrorType(error, ErrorCode.UNAUTHORIZED)
        ) {
          showErrorAlert(ErrorCode.UNAUTHORIZED);
        } else {
          showErrorAlert(error, "操作失敗");
        }
        form.reset();
      }
    },
    [isLogin, isVendor, register, login, form]
  );

  const handleGoogleLogin = useCallback(async () => {
    try {
      const userType: "vendor" | "consumer" = isVendor ? "vendor" : "consumer";
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
      if (
        error instanceof ApiError &&
        isErrorType(error, ErrorCode.UNAUTHORIZED)
      ) {
        showErrorAlert(ErrorCode.UNAUTHORIZED);
      } else {
        showErrorAlert(error, "Google 登入失敗");
      }
    }
  }, [form, googleLogin, isVendor]);

  const handleGoogleRegister = useCallback(async () => {
    try {
      const userType: "vendor" | "consumer" = isVendor ? "vendor" : "consumer";
      const storeName = String(form.getValues("store_name") || "").trim();
      const businessLicense = String(
        form.getValues("business_license") || ""
      ).trim();
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
        setAuthMode("register");
      }
    } catch (error: any) {
      if (
        error instanceof ApiError &&
        isErrorType(error, ErrorCode.UNAUTHORIZED)
      ) {
        showErrorAlert(ErrorCode.UNAUTHORIZED);
      } else {
        showErrorAlert(error, "Google 註冊失敗");
      }
    }
  }, [form, googleLogin, isVendor]);

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
      if (
        error instanceof ApiError &&
        isErrorType(error, ErrorCode.UNAUTHORIZED)
      ) {
        showErrorAlert(ErrorCode.UNAUTHORIZED);
      } else {
        showErrorAlert(error, "完成商戶資料失敗");
      }
    }
  }, [completeMerchantOnboarding, merchantOnboarding, merchantOnboardingValues]);

  const showStandardAuthForm = !(merchantOnboarding && type === "vendor");
  const roleTone = isVendor ? "red" : "blue";
  const roleLabel = isVendor ? "VENDOR" : "EXPLORER";
  const roleZh = isVendor ? "商家" : "消費者";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: pixelColors.bg }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <PixelButton
              label="<< BACK"
              tone="ink"
              size="sm"
              display
              onPress={() => router.back()}
            />
            <PixelChip label={`${roleLabel}  ${roleZh}`} tone={roleTone} active />
          </View>

          {/* Hero */}
          <View style={{ gap: 6, marginTop: 4 }}>
            <PixelText variant="caption" tone="muted" display>
              {isLogin ? "AUTHENTICATE PLAYER" : "CREATE NEW PROFILE"}
            </PixelText>
            <PixelText variant="display">
              {isLogin ? "登入雷達" : "加入雷達"}
            </PixelText>
            <PixelText variant="body" tone="muted">
              {isLogin
                ? "讀取存檔,繼續你的探索旅程。"
                : `建立 ${roleZh} 帳號,1 分鐘加入雷達。`}
            </PixelText>
          </View>

          {/* Merchant onboarding(Google 註冊後仍缺資料) */}
          {merchantOnboarding && type === "vendor" ? (
            <PixelCard title="MERCHANT SETUP" titleTone="gold" titleDisplay padding={16}>
              <PixelChip label="GOOGLE  OK" tone="green" active display />
              <View style={{ height: 12 }} />
              <PixelText variant="bodyLg">再完成一步,即可進入商家後台</PixelText>
              <View style={{ height: 8 }} />
              <PixelText variant="body" tone="muted">
                Google 驗證已通過。補上店名與營業執照,就能建立商家身分。
              </PixelText>
              <View style={{ height: 16 }} />

              <View style={{ gap: 14 }}>
                <PixelTextInput
                  label="店名"
                  placeholder="請輸入您的店名"
                  value={merchantOnboardingValues.store_name}
                  onChangeText={(value) =>
                    setMerchantOnboardingValues((prev) => ({
                      ...prev,
                      store_name: value,
                    }))
                  }
                />
                <PixelTextInput
                  label="營業執照"
                  placeholder="請輸入營業執照號碼"
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

              <View style={{ height: 16 }} />
              <PixelButton
                label={isLoading ? "SAVING..." : "完成設定"}
                tone="gold"
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
              title={isLogin ? "LOGIN" : "REGISTER"}
              titleTone={isLogin ? "blue" : "red"}
              titleDisplay
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
                      borderWidth: 2,
                      borderColor: pixelColors.ink,
                      borderRadius: 4,
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
                    <Controller
                      control={form.control}
                      name="business_license"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <PixelTextInput
                          label="營業執照"
                          placeholder="請輸入營業執照號碼"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          autoCapitalize="characters"
                          returnKeyType="done"
                          error={
                            form.formState.errors.business_license?.message as
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
                label={isLoading ? "..." : isLogin ? "> 登入" : "> 註冊"}
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
                    height: 2,
                    backgroundColor: pixelColors.gray500,
                  }}
                />
                <PixelText variant="caption" tone="muted" display>
                  {isLogin ? "OR" : "OR  SIGN UP WITH"}
                </PixelText>
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: pixelColors.gray500,
                  }}
                />
              </View>

              <GoogleAuthButton
                disabled={isLoading}
                label={isLogin ? "GOOGLE 登入" : "GOOGLE 註冊"}
                onPress={isLogin ? handleGoogleLogin : handleGoogleRegister}
              />

              {!isLogin && isVendor ? (
                <PixelText
                  variant="caption"
                  tone="muted"
                  style={{ marginTop: 10 }}
                >
                  Google 驗證後若是新商家,需要再補齊店名與營業執照。
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
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          backgroundColor: pixelColors.paper,
          borderWidth: 2,
          borderColor: pixelColors.ink,
          borderRadius: 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="logo-google" size={20} color={pixelColors.red} />
      </View>
      <View style={{ flex: 1 }}>
        <PixelButton
          label={label}
          tone="paper"
          fullWidth
          disabled={disabled}
          onPress={onPress}
        />
      </View>
    </View>
  );
}
