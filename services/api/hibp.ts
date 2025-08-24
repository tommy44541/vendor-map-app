import { zxcvbn } from '@zxcvbn-ts/core';

export interface HIBPResponse {
  found: boolean;
  count?: number;
  message?: string;
}

export interface HIBPConfig {
  apiKey?: string;
  baseUrl: string;
  rateLimitDelay: number; // 毫秒
  maxRequestsPerMinute: number;
}

export class HIBPService {
  private config: HIBPConfig;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private requestQueue: (() => Promise<void>)[] = [];

  constructor(config: Partial<HIBPConfig> = {}) {
    this.config = {
      baseUrl: 'https://haveibeenpwned.com/api/v3',
      rateLimitDelay: 2000, // 2秒延迟
      maxRequestsPerMinute: 30,
      ...config,
    };
  }

  /**
   * 检查密码是否在数据泄露中出现
   * 使用 k-anonymity 方法，只发送密码的 SHA-1 哈希前缀
   */
  async checkPassword(password: string): Promise<HIBPResponse> {
    try {
      // 使用 zxcvbn 先进行本地强度检查
      const strengthResult = zxcvbn(password);
      
      // 如果密码强度太低，直接返回建议
      if (strengthResult.score < 2) {
        return {
          found: false,
          message: '密碼強度過低，建議先改善密碼強度',
        };
      }

      // 检查限速
      await this.checkRateLimit();

      // 生成 SHA-1 哈希
      const hash = await this.generateSHA1(password);
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5).toUpperCase();

      // 构建请求 URL
      const url = `${this.config.baseUrl}/pwnedpassword/${prefix}`;
      
      const headers: Record<string, string> = {
        'User-Agent': 'VendorMapApp/1.0',
      };

      if (this.config.apiKey) {
        headers['hibp-api-key'] = this.config.apiKey;
      }

      const response = await fetch(url, { headers });
      
      if (response.status === 200) {
        const text = await response.text();
        const lines = text.split('\n');
        
        // 查找匹配的哈希后缀
        const found = lines.some(line => {
          const [hashSuffix, count] = line.split(':');
          return hashSuffix === suffix;
        });

        if (found) {
          const line = lines.find(l => l.startsWith(suffix));
          const count = line ? parseInt(line.split(':')[1]) : 0;
          
          return {
            found: true,
            count,
            message: `此密碼在 ${count} 次數據泄露中出現過，強烈建議更換`,
          };
        }
      } else if (response.status === 429) {
        // 限速错误
        throw new Error('API 請求過於頻繁，請稍後再試');
      } else if (response.status === 401) {
        // 未授权
        throw new Error('API 密鑰無效或已過期');
      }

      return {
        found: false,
        message: '密碼未在已知數據泄露中發現',
      };
    } catch (error) {
      console.error('HIBP API 檢查失敗:', error);
      throw new Error('密碼安全檢查暫時無法使用，請稍後再試');
    }
  }

  /**
   * 检查邮箱是否在数据泄露中出现
   */
  async checkEmail(email: string): Promise<HIBPResponse> {
    try {
      // 检查限速
      await this.checkRateLimit();

      const url = `${this.config.baseUrl}/breachedaccount/${encodeURIComponent(email)}`;
      
      const headers: Record<string, string> = {
        'User-Agent': 'VendorMapApp/1.0',
      };

      if (this.config.apiKey) {
        headers['hibp-api-key'] = this.config.apiKey;
      }

      const response = await fetch(url, { headers });
      
      if (response.status === 200) {
        const breaches = await response.json();
        return {
          found: true,
          count: breaches.length,
          message: `此郵箱在 ${breaches.length} 次數據泄露中出現過`,
        };
      } else if (response.status === 404) {
        return {
          found: false,
          message: '此郵箱未在已知數據泄露中發現',
        };
      } else if (response.status === 429) {
        throw new Error('API 請求過於頻繁，請稍後再試');
      } else if (response.status === 401) {
        throw new Error('API 密鑰無效或已過期');
      }

      throw new Error('檢查郵箱時發生錯誤');
    } catch (error) {
      console.error('HIBP 郵箱檢查失敗:', error);
      throw error;
    }
  }

  /**
   * 限速检查
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // 如果距离上次请求时间太短，需要等待
    if (now - this.lastRequestTime < this.config.rateLimitDelay) {
      const delay = this.config.rateLimitDelay - (now - this.lastRequestTime);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 检查每分钟请求次数限制
    if (this.requestCount >= this.config.maxRequestsPerMinute) {
      const timeSinceFirstRequest = now - this.lastRequestTime;
      if (timeSinceFirstRequest < 60000) { // 1分钟
        const waitTime = 60000 - timeSinceFirstRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
      } else {
        this.requestCount = 0;
      }
    }

    this.requestCount++;
    this.lastRequestTime = now;
  }

  /**
   * 生成 SHA-1 哈希
   */
  private async generateSHA1(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 重置限速计数器
   */
  resetRateLimit(): void {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * 获取当前限速状态
   */
  getRateLimitStatus(): {
    requestCount: number;
    lastRequestTime: number;
    canMakeRequest: boolean;
  } {
    const now = Date.now();
    const canMakeRequest = 
      now - this.lastRequestTime >= this.config.rateLimitDelay &&
      this.requestCount < this.config.maxRequestsPerMinute;

    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      canMakeRequest,
    };
  }
}

// 创建默认实例
export const hibpService = new HIBPService();
