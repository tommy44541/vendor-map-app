import {
  ANDROID_CLIENT_ID,
  IOS_CLIENT_ID,
  WEB_CLIENT_ID,
} from "@/utils/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  authApi,
  type AuthResultData,
  type UserData,
} from "../services/api/auth";
import { onAccessTokenRefreshed } from "../services/api/authEvents";
import { debugLog } from "@/utils/logger";

const USER_INFO_KEY = "userInfo";
const PUSH_REGISTER_MAX_RETRIES = 2;

const setAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem("authToken", token);
  } catch (error) {
    console.error("設置認證token失敗:", error);
  }
};

const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("獲取認證token失敗:", error);
    return null;
  }
};

const setRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    await AsyncStorage.setItem("refreshToken", refreshToken);
  } catch (error) {
    console.error("設置刷新token失敗:", error);
  }
};

const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("refreshToken");
  } catch (error) {
    console.error("獲取刷新token失敗:", error);
    return null;
  }
};

const clearAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("authToken");
  } catch (error) {
    console.error("清除認證token失敗:", error);
  }
};

const clearRefreshToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("refreshToken");
  } catch (error) {
    console.error("清除刷新token失敗:", error);
  }
};

const saveUserInfo = async (user: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("保存用戶訊息失敗:", error);
  }
};

const getUserInfo = async (): Promise<any | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_INFO_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("獲取用戶訊息失敗:", error);
    return null;
  }
};

const clearUserInfo = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_INFO_KEY);
  } catch (error) {
    console.error("清除用戶訊息失敗:", error);
  }
};

export type UserType = "vendor" | "consumer";
export interface User {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  avatar?: string;
  createdAt: string;
}

export type AuthActionResult =
  | { status: "authenticated"; user: User }
  | {
      status: "onboarding_required";
      onboardingToken: string;
      requestedRole: "vendor" | "consumer";
      requiredFields: string[];
    };

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, userType: UserType) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    userType: UserType;
    store_name?: string;
    business_license?: string;
  }) => Promise<void>;
  googleLogin: (
    userType: UserType,
    options?: {
      forceAccountSelection?: boolean;
      storeName?: string;
      businessLicense?: string;
    }
  ) => Promise<AuthActionResult | void>;
  completeMerchantOnboarding: (input: {
    onboardingToken: string;
    storeName: string;
    businessLicense: string;
  }) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const resolveUserType = (
  apiUser: { user_profile?: unknown; merchant_profile?: unknown },
  preferredUserType: UserType
): UserType => {
  const hasConsumerRole = !!apiUser?.user_profile;
  const hasVendorRole = !!apiUser?.merchant_profile;

  if (preferredUserType === "vendor" && hasVendorRole) return "vendor";
  if (preferredUserType === "consumer" && hasConsumerRole) return "consumer";
  if (hasVendorRole && !hasConsumerRole) return "vendor";
  if (hasConsumerRole) return "consumer";

  return preferredUserType;
};

const mapApiUserToAuthUser = (
  apiUser: UserData,
  preferredUserType: UserType
): User => ({
  id: apiUser.id,
  email: apiUser.email,
  name: apiUser.name,
  userType: resolveUserType(apiUser, preferredUserType),
  createdAt: apiUser.created_at,
});

const roleToUserType = (role: string | undefined, fallback: UserType): UserType => {
  if (role === "merchant") return "vendor";
  if (role === "user") return "consumer";
  return fallback;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const pushRegisterInFlightRef = useRef(false);
  const pushRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    try {
      const webClientId = WEB_CLIENT_ID || ANDROID_CLIENT_ID;
      if (!webClientId) {
        console.warn("Google Sign-In 未設定 web client id，googleLogin 將不可用");
        return;
      }
      GoogleSignin.configure({
        webClientId,
        iosClientId: IOS_CLIENT_ID || undefined,
        offlineAccess: false,
      });
    } catch (e) {
      console.warn("Google Sign-In configure 失敗:", e);
    }
  }, []);

  // 依規格：Token refresh success 也視同已驗證（觸發 push 註冊流程）
  useEffect(() => {
    const off = onAccessTokenRefreshed((newToken) => {
      setAuthState((prev) => ({
        ...prev,
        token: newToken,
        isAuthenticated: !!prev.user,
      }));
    });
    return off;
  }, []);

  // 依規格：Session restore success / Login success / Token refresh success 後觸發
  useEffect(() => {
    if (pushRetryTimerRef.current) {
      clearTimeout(pushRetryTimerRef.current);
      pushRetryTimerRef.current = null;
    }

    if (!authState.isAuthenticated || !authState.token || !authState.user?.id) {
      pushRegisterInFlightRef.current = false;
      return;
    }

    let cancelled = false;
    const run = async (attempt: number) => {
      if (cancelled || pushRegisterInFlightRef.current) return;
      pushRegisterInFlightRef.current = true;

      try {
        const mod = await import("../utils/push");
        const fn = mod?.onUserAuthenticated;
        if (typeof fn !== "function") {
          console.warn("push module not ready: onUserAuthenticated is missing");
          return;
        }

        const res = await fn({
          requestPermissionIfNeeded: attempt === 0,
        });

        // 權限拒絕不重試；token/device 等暫時性問題可有限重試
        const shouldRetry =
          !res.ok &&
          res.step !== "permission" &&
          attempt < PUSH_REGISTER_MAX_RETRIES;

        if (shouldRetry) {
          const delayMs = (attempt + 1) * 1500;
          pushRetryTimerRef.current = setTimeout(() => {
            run(attempt + 1);
          }, delayMs);
        }
      } catch (e) {
        const shouldRetry = attempt < PUSH_REGISTER_MAX_RETRIES;
        if (shouldRetry) {
          const delayMs = (attempt + 1) * 1500;
          pushRetryTimerRef.current = setTimeout(() => {
            run(attempt + 1);
          }, delayMs);
        } else {
          console.warn("push device registration failed:", e);
        }
      } finally {
        pushRegisterInFlightRef.current = false;
      }
    };

    run(0);

    return () => {
      cancelled = true;
      if (pushRetryTimerRef.current) {
        clearTimeout(pushRetryTimerRef.current);
        pushRetryTimerRef.current = null;
      }
    };
  }, [authState.isAuthenticated, authState.token, authState.user?.id]);

  const initializeAuth = async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        const localUser = await getUserInfo();

        if (localUser) {
          setAuthState({
            user: localUser,
            token,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        }
      } else {
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error("初始化認證失敗:", error);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const finalizeAuthenticatedResult = async (
    result: AuthResultData,
    preferredUserType: UserType
  ): Promise<AuthActionResult> => {
    if (!result.access_token || !result.user) {
      throw new Error("認證響應中缺少 access_token 或 user");
    }

    await setAuthToken(result.access_token);
    if (result.refresh_token) {
      await setRefreshToken(result.refresh_token);
    }

    const user = mapApiUserToAuthUser(result.user, preferredUserType);
    await saveUserInfo(user);

    setAuthState({
      user,
      token: result.access_token,
      isLoading: false,
      isAuthenticated: true,
    });

    return { status: "authenticated", user };
  };

  const handleAuthResult = async (
    result: AuthResultData,
    preferredUserType: UserType
  ): Promise<AuthActionResult> => {
    if (result.status === "onboarding_required") {
      const onboardingToken = result.onboarding_token?.trim();
      if (!onboardingToken) {
        throw new Error("商戶補件流程缺少 onboarding token");
      }

      setAuthState((prev) => ({ ...prev, isLoading: false }));
      return {
        status: "onboarding_required",
        onboardingToken,
        requestedRole: roleToUserType(result.requested_role, preferredUserType),
        requiredFields: Array.isArray(result.required_fields)
          ? result.required_fields
          : [],
      };
    }

    return finalizeAuthenticatedResult(result, preferredUserType);
  };

  const login = async (email: string, password: string, userType: UserType) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const response = await authApi.login({ email, password });

      debugLog("🔐 登入API返回摘要:", {
        status: response.data.status,
        hasAccessToken: !!response.data.access_token,
        hasRefreshToken: !!response.data.refresh_token,
        userId: response.data.user?.id,
        userEmail: response.data.user?.email,
      });

      const result = await handleAuthResult(response.data, userType);
      if (result.status === "onboarding_required") {
        throw new Error("此登入流程尚未完成必要資料設定");
      }
    } catch (error) {
      console.error("login error:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    userType: UserType;
    store_name?: string;
    business_license?: string;
  }) => {
    try {
      debugLog("📝 注册資料摘要:", {
        userType: userData.userType,
        email: userData.email,
        hasStoreName: !!userData.store_name,
        hasBusinessLicense: !!userData.business_license,
      });

      setAuthState((prev) => ({ ...prev, isLoading: true }));

      let response: any;

      if (userData.userType === "vendor") {
        debugLog("🏪 註冊商家帳戶");
        // 商家註冊
        response = await authApi.registerMerchant({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          store_name: userData.store_name!,
          business_license: userData.business_license!,
        });
        debugLog("✅ 商家註冊 API 呼叫成功");
      } else {
        debugLog("👤 註冊消費者帳戶");
        // 消費者註冊
        response = await authApi.registerUser({
          name: userData.name,
          email: userData.email,
          password: userData.password,
        });
        debugLog("✅ 消費者註冊 API 呼叫成功");
      }

      debugLog("🔄 註冊成功，準備自動登入");
      const result = await handleAuthResult(response.data, userData.userType);
      if (result.status === "onboarding_required") {
        throw new Error("此註冊流程尚未完成必要資料設定");
      }
      debugLog("✅ 註冊並自動登入完成");
    } catch (error) {
      console.error("❌ AuthContext: 注册失败:", error);
      console.error("🔍 错误详情:", {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
      });
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const googleLogin = async (
    userType: UserType,
    options: {
      forceAccountSelection?: boolean;
      storeName?: string;
      businessLicense?: string;
    } = {}
  ) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      if (options.forceAccountSelection) {
        try {
          await GoogleSignin.revokeAccess();
        } catch {}
        try {
          await GoogleSignin.signOut();
        } catch {}
      }

      const signInResponse = await GoogleSignin.signIn();
      if (!isSuccessResponse(signInResponse)) {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      let idToken = signInResponse.data.idToken;
      if (!idToken) {
        const tokenResponse = await GoogleSignin.getTokens();
        idToken = tokenResponse.idToken;
      }

      if (!idToken) {
        throw new Error("無法取得 Google ID token，請稍後再試");
      }

      const callbackResponse = await authApi.googleLoginCallback({
        idToken,
        requestedRole: userType === "vendor" ? "merchant" : "user",
        state: userType === "vendor" ? "merchant" : "user",
        storeName: options.storeName?.trim() || undefined,
        businessLicense: options.businessLicense?.trim() || undefined,
      });

      return await handleAuthResult(callbackResponse.data, userType);
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (
          error.code === statusCodes.SIGN_IN_CANCELLED ||
          error.code === statusCodes.IN_PROGRESS
        ) {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          throw new Error("Google Play 服務不可用，請檢查裝置設定後再試");
        }
      }

      console.error("google login error:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const completeMerchantOnboarding = async (input: {
    onboardingToken: string;
    storeName: string;
    businessLicense: string;
  }): Promise<AuthActionResult> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const response = await authApi.completeMerchantOnboarding({
        onboarding_token: input.onboardingToken,
        store_name: input.storeName,
        business_license: input.businessLicense,
      });

      return await handleAuthResult(response.data, "vendor");
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  // 登出
  const logout = async () => {
    try {
      // 依規格：登出時停用當前裝置，避免繼續收推播
      try {
        const mod = await import("../utils/push");
        const fn = mod?.deactivateCurrentDeviceOnLogout;
        if (typeof fn === "function") {
          await fn();
        }
      } catch (e) {
        console.warn("logout deactivate device skipped:", e);
      }

      // 获取refresh token用于后端登出
      const refreshToken = await getRefreshToken();

      // 调用后端登出API
      if (refreshToken) {
        try {
          await authApi.logout(refreshToken);
        } catch (error) {
          console.warn("后端登出失败，但继续本地清理:", error);
        }
      }

      // 清除本地存储
      await clearAuthToken();
      await clearRefreshToken();
      await clearUserInfo();
    } catch (error) {
      console.error("清除認證訊息失敗:", error);
    } finally {
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  // 更新用戶訊息
  const updateUser = async (userData: Partial<User>) => {
    setAuthState((prev) => {
      const updatedUser = prev.user ? { ...prev.user, ...userData } : null;

      // 同步更新本地儲存的使用者訊息
      if (updatedUser) {
        saveUserInfo(updatedUser);
      }

      return {
        ...prev,
        user: updatedUser,
      };
    });
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    googleLogin,
    completeMerchantOnboarding,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 使用認證上下文的Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth必須在AuthProvider內部使用");
  }
  return context;
};
