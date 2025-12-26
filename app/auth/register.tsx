import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import PasswordStrength from "../../components/PasswordStrength";
import { useAuth } from "../../contexts/AuthContext";
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

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type: string }>();
  const type = params?.type;
  const { register, login, isLoading } = useAuth();

  const [isLogin, setIsLogin] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [toggleContainerWidth, setToggleContainerWidth] = useState(0);

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

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isLogin ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isLogin, slideAnim]);

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      try {
        const userType = type as "vendor" | "consumer";

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
        if (isErrorType(error.cause.status, ErrorCode.UNAUTHORIZED)) {
          showErrorAlert(error.cause.status);
        } else {
          showErrorAlert(error, "操作失敗");
        }
        form.reset();
      }
    },
    [isLogin, register, login, type, form]
  );

  const userTypeText = type === "vendor" ? "攤車商家" : "消費者";

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

  return (
    <View className="flex-1 bg-ui-background">
      <StatusBar barStyle="dark-content" />
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
            {/* Header */}
            <View className="flex-row items-center py-4 mb-6">
              <TouchableOpacity
                className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-ui-border"
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <View className="mb-8">
              <Text className="text-3xl font-bold text-brand-dark mb-2">
                {isLogin ? "歡迎回來" : "建立帳戶"}
              </Text>
              <Text className="text-ui-text-secondary text-base">
                {isLogin
                  ? "請輸入您的帳號密碼以繼續"
                  : `填寫以下資料以註冊${userTypeText}帳戶`}
              </Text>
            </View>

            {/* Toggle Switch */}
            <View
              className="bg-gray-100 rounded-2xl p-1 mb-8 h-14 relative justify-center"
              onLayout={(e) =>
                setToggleContainerWidth(e.nativeEvent.layout.width)
              }
            >
              <Animated.View
                className="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm"
                style={{
                  left: slideLeft,
                  width: toggleThumbWidth,
                }}
              />
              <View className="flex-row h-full">
                <TouchableOpacity
                  className="flex-1 items-center justify-center z-10"
                  onPress={() => setIsLogin(false)}
                  activeOpacity={1}
                >
                  <Text
                    className={`text-base font-semibold ${
                      !isLogin ? "text-brand-primary" : "text-gray-500"
                    }`}
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
                    className={`text-base font-semibold ${
                      isLogin ? "text-brand-primary" : "text-gray-500"
                    }`}
                  >
                    登入
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Form */}
            <View className="space-y-5">
              {!isLogin && (
                <View className="space-y-2">
                  <Text className="text-sm font-medium text-ui-text-primary ml-1">
                    姓名
                  </Text>
                  <Controller
                    control={form.control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className={`bg-white border rounded-xl px-4 py-3.5 text-base text-ui-text-primary ${
                          form.formState.errors.name
                            ? "border-ui-error"
                            : "border-ui-border focus:border-brand-secondary"
                        }`}
                        placeholder="請輸入您的姓名"
                        placeholderTextColor="#9CA3AF"
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
                <Text className="text-sm font-medium text-ui-text-primary ml-1">
                  電子郵件
                </Text>
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`bg-white border rounded-xl px-4 py-3.5 text-base text-ui-text-primary ${
                        form.formState.errors.email
                          ? "border-ui-error"
                          : "border-ui-border focus:border-brand-secondary"
                      }`}
                      placeholder="請輸入您的電子郵件"
                      placeholderTextColor="#9CA3AF"
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
                <Text className="text-sm font-medium text-ui-text-primary ml-1">
                  密碼
                </Text>
                <Controller
                  control={form.control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="relative">
                      <TextInput
                        className={`bg-white border rounded-xl px-4 py-3.5 text-base text-ui-text-primary pr-12 ${
                          form.formState.errors.password
                            ? "border-ui-error"
                            : "border-ui-border focus:border-brand-secondary"
                        }`}
                        placeholder="請輸入您的密碼"
                        placeholderTextColor="#9CA3AF"
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
                          color="#9CA3AF"
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
                  <Text className="text-sm font-medium text-ui-text-primary ml-1">
                    確認密碼
                  </Text>
                  <Controller
                    control={form.control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="relative">
                        <TextInput
                          className={`bg-white border rounded-xl px-4 py-3.5 text-base text-ui-text-primary pr-12 ${
                            form.formState.errors.confirmPassword
                              ? "border-ui-error"
                              : "border-ui-border focus:border-brand-secondary"
                          }`}
                          placeholder="請再次輸入密碼"
                          placeholderTextColor="#9CA3AF"
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
                            color="#9CA3AF"
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

              {/* 商家註冊額外欄位 */}
              {!isLogin && type === "vendor" && (
                <>
                  <View className="space-y-2">
                    <Text className="text-sm font-medium text-ui-text-primary ml-1">
                      店名
                    </Text>
                    <Controller
                      control={form.control}
                      name="store_name"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          className={`bg-white border rounded-xl px-4 py-3.5 text-base text-ui-text-primary ${
                            form.formState.errors.store_name
                              ? "border-ui-error"
                              : "border-ui-border focus:border-brand-secondary"
                          }`}
                          placeholder="請輸入您的店名"
                          placeholderTextColor="#9CA3AF"
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
                    <Text className="text-sm font-medium text-ui-text-primary ml-1">
                      營業執照號碼
                    </Text>
                    <Controller
                      control={form.control}
                      name="business_license"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          className={`bg-white border rounded-xl px-4 py-3.5 text-base text-ui-text-primary ${
                            form.formState.errors.business_license
                              ? "border-ui-error"
                              : "border-ui-border focus:border-brand-secondary"
                          }`}
                          placeholder="請輸入營業執照號碼"
                          placeholderTextColor="#9CA3AF"
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

              {/* 提交按钮 */}
              <TouchableOpacity
                className={`rounded-xl py-4 items-center mt-4 shadow-sm ${
                  isLoading
                    ? "bg-gray-300"
                    : "bg-brand-primary active:bg-gray-600"
                }`}
                onPress={form.handleSubmit(onSubmit)}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-lg font-bold tracking-wide">
                    {isLogin ? "登入" : "註冊"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
