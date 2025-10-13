import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../services/api/auth";
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from "../utils/constants";

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  iosClientId: IOS_CLIENT_ID,
});

const USER_INFO_KEY = "userInfo";

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
  googleLogin: (userType: UserType) => Promise<void>;
  googleLogout: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

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

  useEffect(() => {
    initializeAuth();
  }, []);

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

  const login = async (email: string, password: string, userType: UserType) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const response = await authApi.login({ email, password });

      console.log("🔐 登入API返回數據:", JSON.stringify(response, null, 2));
      console.log("🔑 AccessToken值:", response.data.access_token);
      console.log("🔄 RefreshToken值:", response.data.refresh_token);
      console.log("👤 用戶數據:", response.data.user);

      if (!response.data.access_token) {
        throw new Error("登入響應中缺少access_token欄位");
      }

      await setAuthToken(response.data.access_token);

      if (response.data.refresh_token) {
        await setRefreshToken(response.data.refresh_token);
      }

      const user: User = {
        id: response.data.user.id,
        email: response.data.user.email,
        name: response.data.user.name,
        userType: userType,
        createdAt: response.data.user.created_at,
      };

      await saveUserInfo(user);

      setAuthState({
        user,
        token: response.data.access_token,
        isLoading: false,
        isAuthenticated: true,
      });
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
      console.log("📝 注册数据:", JSON.stringify(userData, null, 2));

      setAuthState((prev) => ({ ...prev, isLoading: true }));

      let response: any;

      if (userData.userType === "vendor") {
        console.log("🏪 注册商家账户");
        // 商家註冊
        response = await authApi.registerMerchant({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          store_name: userData.store_name!,
          business_license: userData.business_license!,
        });
        console.log("✅ 商家注册API调用成功:", response);
      } else {
        console.log("👤 注册消费者账户");
        // 消費者註冊
        response = await authApi.registerUser({
          name: userData.name,
          email: userData.email,
          password: userData.password,
        });
        console.log("✅ 消费者注册API调用成功:", response);
      }

      console.log("🔄 注册成功，准备自动登录");
      // 註冊成功後自動登錄
      await login(userData.email, userData.password, userData.userType);
      console.log("✅ 注册并自动登录完成");
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

  // Google登入
  const googleLogin = async (userType: UserType) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        if (response.data.idToken) {
          console.log("🔄 Google sign in idToken:", response.data.idToken);
          const callbackResponse = await authApi.googleLoginCallback(
            response.data.idToken
          );
          console.log("🔄 Google sign in callback response:", callbackResponse);

          // 检查回调响应是否成功
          if (callbackResponse.success && callbackResponse.data) {
            const { access_token, refresh_token, user } = callbackResponse.data;

            // 保存tokens
            await setAuthToken(access_token);
            if (refresh_token) {
              await setRefreshToken(refresh_token);
            }

            //TODO: 目前為前端判斷，未來考慮後端回傳結構判斷
            let actualUserType: UserType = "consumer"; // 默认为消费者

            if (userType) {
              actualUserType = userType;
            }

            // 转换用户数据格式
            const userData: User = {
              id: user.id,
              email: user.email,
              name: user.name,
              userType: actualUserType,
              createdAt: user.created_at,
            };

            // 保存用户信息到本地存储
            await saveUserInfo(userData);

            // 更新认证状态
            setAuthState({
              user: userData,
              token: access_token,
              isLoading: false,
              isAuthenticated: true,
            });

            console.log(`✅ Google OAuth登录成功，用户类型: ${actualUserType}`);
          } else {
            throw new Error("Google OAuth回调失败");
          }
        } else {
          console.error("Google sign in failed - 没有idToken");
          throw new Error("Google登录失败");
        }
      } else {
        console.error("Google sign cancelled");
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Google登录错误:", error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const googleLogout = async () => {
    try {
      await GoogleSignin.signOut();
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  // 登出
  const logout = async () => {
    try {
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
    googleLogout,
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
