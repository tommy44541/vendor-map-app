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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";
import EnhancedPasswordStrengthMeter from "../../components/EnhancedPasswordStrengthMeter";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../services/api/auth";
import {
  ERROR_CODES,
  isErrorType,
  showErrorAlert,
  showSuccessAlert,
} from "../../utils/errorHandler";
import {
  DEFAULT_PASSWORD_REQUIREMENTS,
  checkPasswordRequirements,
  validatePassword,
} from "../../utils/passwordValidation";

// 创建动态验证schema
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
            // 使用统一的密码要求检查函数
            const requirementsCheck = checkPasswordRequirements(
              password,
              DEFAULT_PASSWORD_REQUIREMENTS
            );

            // 如果基础要求不满足，添加相应的错误信息
            if (!requirementsCheck.isValid) {
              ctx.addIssue({
                code: "custom",
                message: requirementsCheck.errorMessage || "密碼不符合要求",
              });
              return;
            }

            // 最后检查密码强度
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
  const type = params?.type || "consumer";
  const { register, login, googleLogin, isLoading } = useAuth();

  const [isLogin, setIsLogin] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // 使用 useMemo 动态创建验证 schema
  const validationSchema = useMemo(
    () => createValidationSchema(isLogin),
    [isLogin]
  );

  // 使用单个表单，支持所有字段
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
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
      email: "",
      password: "",
      confirmPassword: "",
      store_name: "",
      business_license: "",
    });
  }, [isLogin, form]);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isLogin ? 120 : 0,
      duration: 300,
      useNativeDriver: false, // 因为我们要动画left属性
    }).start();
  }, [isLogin, slideAnim]);

  // 处理表单提交
  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      try {
        const userType = (type as "vendor" | "consumer") || "consumer";

        if (isLogin) {
          // 登录逻辑 - 只使用email和password
          await login(data.email, data.password, userType);
        } else {
          // 注册逻辑 - 使用所有字段，确保name存在
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

        // 登录成功后，AuthContext会自动处理路由跳转
        // 注册成功后自动跳转到对应首页
        if (!isLogin) {
          if (userType === "vendor") {
            router.replace("/vendor/home");
          } else {
            router.replace("/consumer/home");
          }
        }
      } catch (error: any) {
        if (isErrorType(error, ERROR_CODES.USER_ALREADY_EXISTS)) {
          showErrorAlert(error, "註冊失敗", () => {
            setIsLogin(true);
            form.setValue("password", "");
            form.setValue("confirmPassword", "");
          });
        } else if (isErrorType(error, ERROR_CODES.EMAIL_ALREADY_REGISTERED)) {
          showErrorAlert(error, "註冊失敗", () => {
            form.setValue("email", "");
            form.setValue("password", "");
            form.setValue("confirmPassword", "");
          });
        } else {
          showErrorAlert(error, "操作失敗");
        }
      }
    },
    [isLogin, register, login, type, router, form]
  );

  const userTypeText = type === "vendor" ? "攤車商家" : "消費者";
  const pageTitle = isLogin
    ? `登入${userTypeText}帳戶`
    : `註冊${userTypeText}帳戶`;

  // 健康检查功能
  const testHealth = async () => {
    try {
      const result = await authApi.healthCheck();
      showSuccessAlert(`健康检查通过: ${JSON.stringify(result)}`, "连接测试");
    } catch (error: any) {
      showErrorAlert(error, "连接测试失败");
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1 bg-gray-50 mt-20"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 返回上一頁箭頭 */}
        <TouchableOpacity
          className="rounded-xl p-2 pt-4 ml-4"
          onPress={() => router.back()}
        >
          <Text className="text-2xl font-bold text-gray-700">←</Text>
        </TouchableOpacity>
        <View className="flex-row justify-center items-center mb-4">
          <Text className="text-2xl font-bold text-gray-700">{pageTitle}</Text>
        </View>
        {/* 註冊/登入切換元件 */}
        <View className="flex-row justify-center items-center my-4">
          <View className="relative flex flex-row overflow-hidden w-[240px] h-14 bg-[#E5E7EB] rounded-full">
            {/* 動態滑動的選中框 */}
            <Animated.View
              className="absolute top-0 w-1/2 h-14 bg-white rounded-full shadow-black shadow-xs z-[1] elevation-sm"
              style={{
                left: slideAnim,
              }}
            />
            {/* 註冊按鈕 */}
            <TouchableOpacity
              style={{
                width: 120,
                height: 48,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 2,
              }}
              activeOpacity={0.8}
              onPress={() => {
                if (isLogin) {
                  setIsLogin(false);
                }
              }}
            >
              <Text
                style={{
                  color: !isLogin ? "#4F46E5" : "#6B7280", // indigo-600 or gray-500
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                註冊
              </Text>
            </TouchableOpacity>
            {/* 登入按鈕 */}
            <TouchableOpacity
              style={{
                width: 120,
                height: 48,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 2,
              }}
              activeOpacity={0.8}
              onPress={() => {
                if (!isLogin) {
                  setIsLogin(true);
                }
              }}
            >
              <Text
                style={{
                  color: isLogin ? "#4F46E5" : "#6B7280", // indigo-600 or gray-500
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                登入
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-1 px-6">
          {/* 表单 */}
          <View className="space-y-5">
            {!isLogin && (
              <View className="space-y-2">
                <Text className="text-base font-semibold text-gray-700">
                  姓名
                </Text>
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`border rounded-xl px-4 py-4 text-base leading-tight ${
                        form.formState.errors.name
                          ? "border-red-500"
                          : "border-gray-300"
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
                  <Text className="text-red-500 text-sm ml-1">
                    {form.formState.errors.name.message}
                  </Text>
                )}
              </View>
            )}

            <View className="space-y-2">
              <Text className="text-base font-semibold text-gray-700">
                電子郵件
              </Text>
              <Controller
                control={form.control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`bg-white border rounded-xl px-4 py-4 text-base leading-tight ${
                      form.formState.errors.email
                        ? "border-red-500"
                        : "border-gray-300"
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
              {/* 错误显示 */}
              {isLogin
                ? form.formState.errors.email && (
                    <Text className="text-red-500 text-sm ml-1">
                      {form.formState.errors.email.message}
                    </Text>
                  )
                : form.formState.errors.email && (
                    <Text className="text-red-500 text-sm ml-1">
                      {form.formState.errors.email.message}
                    </Text>
                  )}
            </View>

            <View className="space-y-2">
              <Text className="text-base font-semibold text-gray-700">
                密碼
              </Text>
              <Controller
                control={form.control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="relative">
                    <TextInput
                      className={`bg-white border rounded-xl px-4 py-4 text-base leading-tight ${
                        form.formState.errors.password
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="請輸入您的密碼"
                      placeholderTextColor="#9CA3AF"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!isPasswordVisible}
                      returnKeyType="done"
                    />
                    <View className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Ionicons
                        name={isPasswordVisible ? "eye-off" : "eye"}
                        size={24}
                        color="#9CA3AF"
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                      />
                    </View>
                  </View>
                )}
              />

              {/* 密码强度检查 - 仅在注册模式显示 */}
              {!isLogin && form.watch("password") && (
                <EnhancedPasswordStrengthMeter
                  password={form.watch("password")}
                  showHIBPCheck={true}
                />
              )}

              {/* 错误显示 */}
              {form.formState.errors.password && (
                <View className="flex-row items-center space-x-2">
                  <Text className="text-red-500 text-sm">
                    {form.formState.errors.password.message}
                  </Text>
                </View>
              )}
            </View>
            {!isLogin && (
              <View className="space-y-2">
                <Text className="text-base font-semibold text-gray-700">
                  確認密碼
                </Text>
                <Controller
                  control={form.control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="relative">
                      <TextInput
                        className={`bg-white border rounded-xl px-4 py-4 text-base leading-tight ${
                          form.formState.errors.confirmPassword
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="請再次輸入密碼"
                        placeholderTextColor="#9CA3AF"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry={!isConfirmPasswordVisible}
                        returnKeyType="done"
                      />
                      <View className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Ionicons
                          name={isConfirmPasswordVisible ? "eye-off" : "eye"}
                          size={24}
                          color="#9CA3AF"
                          onPress={() =>
                            setIsConfirmPasswordVisible(
                              !isConfirmPasswordVisible
                            )
                          }
                        />
                      </View>
                    </View>
                  )}
                />
                {form.formState.errors.confirmPassword && (
                  <Text className="text-red-500 text-sm ml-1">
                    {form.formState.errors.confirmPassword.message}
                  </Text>
                )}
              </View>
            )}

            {/* 商家註冊額外欄位 */}
            {!isLogin && type === "vendor" && (
              <>
                <View className="space-y-2">
                  <Text className="text-base font-semibold text-gray-700">
                    店名
                  </Text>
                  <Controller
                    control={form.control}
                    name="store_name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className={`bg-white border rounded-xl px-4 py-4 text-base leading-tight ${
                          form.formState.errors.store_name
                            ? "border-red-500"
                            : "border-gray-300"
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
                    <Text className="text-red-500 text-sm ml-1">
                      {form.formState.errors.store_name.message}
                    </Text>
                  )}
                </View>

                <View className="space-y-2">
                  <Text className="text-base font-semibold text-gray-700">
                    營業執照號碼
                  </Text>
                  <Controller
                    control={form.control}
                    name="business_license"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className={`bg-white border rounded-xl px-4 py-4 text-base leading-tight  ${
                          form.formState.errors.business_license
                            ? "border-red-500"
                            : "border-gray-300"
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
                    <Text className="text-red-500 text-sm ml-1">
                      {form.formState.errors.business_license.message}
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* 提交按钮 */}
            <TouchableOpacity
              className={`bg-indigo-500 rounded-xl py-4 items-center mt-2 ${
                isLoading ? "bg-gray-400" : ""
              }`}
              onPress={() => {
                console.log("🔘 提交按钮被点击");
                console.log("📝 表单状态:", {
                  isValid: form.formState.isValid,
                  errors: form.formState.errors,
                  isDirty: form.formState.isDirty,
                });

                // 然后执行表单提交
                form.handleSubmit(onSubmit)();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-semibold">
                  {isLogin ? "登入" : "註冊"}
                </Text>
              )}
            </TouchableOpacity>

            {/* 分割线 */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-500 text-sm">或</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Google登录按钮 */}
            <TouchableOpacity
              className="bg-white border border-gray-300 rounded-xl py-4 items-center"
              //onPress={startGoogleLogin}
              onPress={googleLogin}
              disabled={isLoading}
            >
              <Text className="text-gray-700 text-base font-medium">
                使用 Google 帳戶繼續
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
