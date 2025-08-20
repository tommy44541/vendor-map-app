// 環境配置
export const ENV = {
  // 開發環境
  development: {
    API_BASE_URL: 'http://192.168.1.149:4433',
    API_TIMEOUT: 10000,
  },
  // 測試環境
  test: {
    API_BASE_URL: 'https://staging-api.yourdomain.com',
    API_TIMEOUT: 15000,
  },
  // 生產環境
  production: {
    API_BASE_URL: 'https://api.yourdomain.com',
    API_TIMEOUT: 20000,
  },
};

// 當前環境（可以通過環境變數或構建配置來設置）
export const CURRENT_ENV = process.env.NODE_ENV || 'development';

// 導出當前環境的配置
export const API_CONFIG = ENV[CURRENT_ENV as keyof typeof ENV] || ENV.development;

// 環境變數
export const IS_DEV = CURRENT_ENV === 'development';
export const IS_TEST = CURRENT_ENV === 'test';
export const IS_PROD = CURRENT_ENV === 'production';
