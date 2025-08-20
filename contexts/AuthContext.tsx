import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../services/api/auth";
import {
  clearAuthToken,
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
} from "../services/api/core";

// 用戶訊息鍵
const USER_INFO_KEY = "userInfo";

// 保存用戶訊息到本地儲存
const saveUserInfo = async (user: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("保存用戶訊息失敗:", error);
  }
};

// 獲取本地儲存的使用者訊息
const getUserInfo = async (): Promise<any | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_INFO_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("獲取用戶訊息失敗:", error);
    return null;
  }
};

// 清除本地儲存的使用者訊息
const clearUserInfo = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_INFO_KEY);
  } catch (error) {
    console.error("清除用戶訊息失敗:", error);
  }
};

// 清除刷新token
const clearRefreshToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("refreshToken");
  } catch (error) {
    console.error("清除刷新token失敗:", error);
  }
};

// 用戶類型
export type UserType = "vendor" | "consumer";

// 用戶訊息介面
export interface User {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  avatar?: string;
  createdAt: string;
}

// 認證狀態介面
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// 認證上下文介面
interface AuthContextType extends AuthState {
  login: (
    email: string,
    password: string,
    userType?: UserType
  ) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    userType: UserType;
    store_name?: string;
    business_license?: string;
  }) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

// 創建認證上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 認證提供者元件
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // 初始化認證狀態
  useEffect(() => {
    initializeAuth();
  }, []);

  // 初始化認證狀態
  const initializeAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        // 首先嘗試從本地儲存獲取用戶訊息
        const localUser = await getUserInfo();

        if (localUser) {
          // 如果有本地用戶訊息，直接使用
          setAuthState({
            user: localUser,
            token,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        }

        // 如果沒有本地用戶訊息，嘗試從API獲取
        try {
          // 要區分用戶類型，消費者或商家的資料
          const response = (await authApi.getUserInfo()) as any;

          // 轉換用戶數據格式
          const user: User = {
            id: response.id,
            email: response.email,
            name: response.name,
            userType: response.merchant_profile ? "vendor" : "consumer",
            createdAt: response.created_at,
          };

          // 保存用戶訊息到本地儲存
          await saveUserInfo(user);

          setAuthState({
            user,
            token,
            isLoading: false,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error("Token驗證失敗:", error);

          if (error instanceof Error && error.message.includes("404")) {
            console.warn("API端點不存在，保持當前認證狀態");
            setAuthState({
              user: null,
              token,
              isLoading: false,
              isAuthenticated: false,
            });
          } else {
            // 其他錯誤，清除認證狀態
            await clearAuthToken();
            await clearUserInfo();
            setAuthState({
              user: null,
              token: null,
              isLoading: false,
              isAuthenticated: false,
            });
          }
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

  // 登入
  const login = async (
    email: string,
    password: string,
    userType: UserType = "consumer"
  ) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const response = await authApi.login({ email, password });

      // 添加詳細日誌
      console.log("🔐 登入API返回數據:", JSON.stringify(response, null, 2));
      console.log("🔑 AccessToken值:", response.data.access_token);
      console.log("🔄 RefreshToken值:", response.data.refresh_token);
      console.log("👤 用戶數據:", response.data.user);

      // 检查token是否存在
      if (!response.data.access_token) {
        throw new Error("登入響應中缺少access_token欄位");
      }

      // 保存token
      await setAuthToken(response.data.access_token);

      // 保存刷新token
      if (response.data.refresh_token) {
        await setRefreshToken(response.data.refresh_token);
      }

      // 轉換用戶數據格式
      const actualUserType = response.data.user.merchant_profile
        ? "vendor"
        : "consumer";

      // 驗證用戶類型是否匹配
      if (actualUserType !== userType) {
        throw new Error(
          `此帳號是${
            actualUserType === "vendor" ? "攤車商家" : "消費者"
          }帳號，請選擇正確的身份`
        );
      }

      const user: User = {
        id: response.data.user.id,
        email: response.data.user.email,
        name: response.data.user.name,
        userType: actualUserType,
        createdAt: response.data.user.created_at,
      };

      // 保存用戶訊息到本地儲存
      await saveUserInfo(user);

      setAuthState({
        user,
        token: response.data.access_token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  // 註冊
  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    userType: UserType;
    store_name?: string;
    business_license?: string;
  }) => {
    try {
      console.log("🔐 AuthContext: 开始注册流程");
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
  const googleLogin = async (idToken: string) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // 模擬Google登錄成功
      const mockUser: User = {
        id: "1",
        email: "google_user@example.com",
        name: "Google用戶",
        userType: "consumer",
        createdAt: new Date().toISOString(),
      };

      const mockToken = "google_token_" + Date.now();
      await AsyncStorage.setItem("authToken", mockToken);

      // 保存用戶訊息到本地儲存
      await saveUserInfo(mockUser);

      setAuthState({
        user: mockUser,
        token: mockToken,
        isLoading: false,
        isAuthenticated: true,
      });
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
