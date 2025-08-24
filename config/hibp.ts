import { HIBPConfig } from '../services/api/hibp';

// HIBP API 配置
export const HIBP_CONFIG: HIBPConfig = {
  apiKey: process.env.EXPO_PUBLIC_HIBP_API_KEY || undefined,
  
  // API 基礎 URL
  baseUrl: 'https://haveibeenpwned.com/api/v3',
  
  // 限速配置（毫秒）
  rateLimitDelay: 2000, // 2秒延遲
  
  // 每分鐘最大請求次數
  maxRequestsPerMinute: 30,
};

// 开发环境配置
export const DEV_HIBP_CONFIG: HIBPConfig = {
  ...HIBP_CONFIG,
  rateLimitDelay: 1000, // 開發環境減少延遲
  maxRequestsPerMinute: 60, // 開發環境增加請求次數
};

// 生产环境配置
export const PROD_HIBP_CONFIG: HIBPConfig = {
  ...HIBP_CONFIG,
  rateLimitDelay: 3000, // 生產環境增加延遲
  maxRequestsPerMinute: 20, // 生產環境減少請求次數
};

// 根據環境返回相應配置
export function getHIBPConfig(): HIBPConfig {
  if (__DEV__) {
    return DEV_HIBP_CONFIG;
  }
  return PROD_HIBP_CONFIG;
}

// 检查是否启用了 HIBP 功能
export function isHIBPEnabled(): boolean {
  // 檢查是否有 API 密鑰或是否允許使用免費版本
  return true; // 暫時總是啟用，後續可以根據配置調整
}

// 獲取 HIBP 功能狀態信息
export function getHIBPStatus(): {
  enabled: boolean;
  hasApiKey: boolean;
  rateLimit: string;
  features: string[];
} {
  const config = getHIBPConfig();
  
  return {
    enabled: isHIBPEnabled(),
    hasApiKey: !!config.apiKey,
    rateLimit: `${config.rateLimitDelay}ms 延遲，每分鐘最多 ${config.maxRequestsPerMinute} 次請求`,
    features: [
      '密碼強度檢查 (zxcvbn)',
      '資料洩露檢查 (HIBP)',
      '自動限速處理',
      '實時反饋和建議',
    ],
  };
}
