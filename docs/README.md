# Vendor Map App

一個連接攤車商家與消費者的移動應用程式。

## 功能特色

- 🔐 用戶認證系統（註冊/登入）
- 👥 雙角色支持：消費者與攤車商家
- 🏪 商家註冊（包含店名和營業執照驗證）
- 🗺️ 地圖整合
- 📱 響應式設計，支持虛擬鍵盤

## 技術架構

- **前端**: React Native + Expo
- **狀態管理**: React Context + React Hook Form
- **樣式**: NativeWind (Tailwind CSS)
- **導航**: Expo Router
- **API**: 自定義HTTP客戶端

## 後端API整合

### 認證端點

#### 用戶註冊 (消費者)
```bash
POST /auth/register/user
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "a_very_secure_password"
}
```

#### 商家註冊
```bash
POST /auth/register/merchant
Content-Type: application/json

{
  "name": "Good Coffee",
  "email": "owner@goodcoffee.com",
  "password": "another_secure_password",
  "store_name": "Good Coffee Shop",
  "business_license": "12345678"
}
```

#### 用戶登入
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "a_very_secure_password"
}
```

### 環境配置

應用程式支援多環境配置：

- **開發環境**: `http://localhost:4433`
- **測試環境**: `https://staging-api.yourdomain.com`
- **生產環境**: `https://api.yourdomain.com`

環境配置位於 `config/env.ts`

## 安裝與運行

### 前置需求

- Node.js 18+
- npm 或 yarn
- Expo CLI
- iOS Simulator 或 Android Emulator

### 安裝依賴

```bash
npm install
# 或
yarn install
```

### 啟動開發服務器

```bash
npm start
# 或
yarn start
```

### 運行平台

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 專案結構

```
vendor_map_app/
├── app/                    # Expo Router 頁面
│   ├── auth/              # 認證相關頁面
│   ├── consumer/          # 消費者頁面
│   ├── vendor/            # 商家頁面
│   └── _layout.tsx        # 根佈局
├── components/             # 可重用組件
├── contexts/               # React Context
├── services/               # API 服務
├── config/                 # 配置文件
├── constants/              # 常量定義
├── interfaces/             # TypeScript 接口
└── types/                  # 類型定義
```

## API 服務使用

### 基本用法

```typescript
import { authApi } from '../services/api';

// 用戶註冊
try {
  const response = await authApi.registerUser({
    name: "John Doe",
    email: "john@example.com",
    password: "password123"
  });
  console.log('註冊成功:', response);
} catch (error) {
  console.error('註冊失敗:', error.message);
}

// 商家註冊
try {
  const response = await authApi.registerMerchant({
    name: "Jane Smith",
    email: "jane@coffee.com",
    password: "password123",
    store_name: "Coffee Corner",
    business_license: "LIC123456"
  });
  console.log('商家註冊成功:', response);
} catch (error) {
  console.error('商家註冊失敗:', error.message);
}

// 用戶登入
try {
  const response = await authApi.login({
    email: "john@example.com",
    password: "password123"
  });
  console.log('登入成功:', response);
} catch (error) {
  console.error('登入失敗:', error.message);
}
```

### 認證狀態管理

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (isAuthenticated) {
    return <Text>歡迎回來, {user?.name}!</Text>;
  }

  return <Text>請先登入</Text>;
}
```

## 開發注意事項

### 虛擬鍵盤處理

應用程式已整合 `KeyboardAvoidingView` 來處理虛擬鍵盤遮擋問題：

- iOS: 使用 `padding` 行為
- Android: 使用 `height` 行為
- 自動滾動確保輸入欄位可見

### 表單驗證

使用 `react-hook-form` 進行表單管理：

- 實時驗證
- 錯誤訊息顯示
- 密碼確認驗證
- 商家註冊額外欄位驗證

### 類型安全

完整的 TypeScript 支持：

- API 響應類型定義
- 表單數據類型
- 用戶角色類型
- 錯誤處理類型

## 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 授權

此專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 文件

## 聯絡資訊

如有問題或建議，請開啟 Issue 或聯絡開發團隊。
