# 密码验证功能说明

## 概述

本项目集成了先进的密码验证系统，使用 `zxcvbn` 进行密码强度检查，并支持 HIBP (Have I Been Pwned) API 进行数据泄露检查。

## 功能特性

### 1. 密码强度检查 (zxcvbn)

- **实时强度评估**: 使用 Dropbox 的 zxcvbn 算法
- **5级强度评分**: 非常弱 (0) → 弱 (1) → 一般 (2) → 强 (3) → 非常强 (4)
- **智能反馈**: 提供具体的改善建议
- **破解时间估算**: 显示密码被破解所需的时间

### 2. 数据泄露检查 (HIBP)

- **隐私保护**: 使用 k-anonymity 方法，只发送密码哈希前缀
- **实时检查**: 检查密码是否在已知数据泄露中出现
- **限速处理**: 自动处理 API 限速，避免请求过于频繁

### 3. 用户体验

- **实时反馈**: 用户输入密码时立即显示强度信息
- **视觉指示**: 颜色编码的强度条和标签
- **详细建议**: 具体的密码改善建议
- **状态显示**: 清晰的验证通过/失败状态

## 使用方法

### 基础密码强度检查

```tsx
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

<PasswordStrengthMeter 
  password={password} 
  showFeedback={true}
/>
```

### 增强版密码检查（包含 HIBP）

```tsx
import EnhancedPasswordStrengthMeter from '../components/EnhancedPasswordStrengthMeter';

<EnhancedPasswordStrengthMeter 
  password={password}
  email={email}
  showHIBPCheck={true}
  onValidationChange={(isValid) => {
    console.log('密码验证状态:', isValid);
  }}
/>
```

### 程序化密码验证

```tsx
import { validatePassword, DEFAULT_PASSWORD_REQUIREMENTS } from '../utils/passwordValidation';

const validation = validatePassword(password, DEFAULT_PASSWORD_REQUIREMENTS);

if (validation.isValid) {
  console.log('密码验证通过');
} else {
  console.log('密码验证失败:', validation.feedback.suggestions);
}
```

## 配置选项

### 密码要求配置

```typescript
const customRequirements = {
  minLength: 10,                    // 最小长度
  requireUppercase: true,           // 需要大写字母
  requireLowercase: true,           // 需要小写字母
  requireNumbers: true,             // 需要数字
  requireSpecialChars: true,        // 需要特殊字符
  minScore: 3,                      // 最低强度评分 (0-4)
};
```

### HIBP API 配置

```typescript
// 在 config/hibp.ts 中配置
export const HIBP_CONFIG: HIBPConfig = {
  apiKey: process.env.EXPO_PUBLIC_HIBP_API_KEY,
  baseUrl: 'https://haveibeenpwned.com/api/v3',
  rateLimitDelay: 2000,            // 请求间隔 (毫秒)
  maxRequestsPerMinute: 30,        // 每分钟最大请求数
};
```

## 环境变量

```bash
# .env 文件
EXPO_PUBLIC_HIBP_API_KEY=your_hibp_api_key_here
```

## 限速处理

系统自动处理 HIBP API 的限速要求：

- **请求间隔**: 默认 2 秒延迟
- **频率限制**: 每分钟最多 30 次请求
- **自动重试**: 遇到限速错误时自动等待
- **队列管理**: 智能管理请求队列

## 安全特性

### 隐私保护

- **k-anonymity**: 只发送密码哈希的前 5 位字符
- **本地处理**: 密码强度检查完全在本地进行
- **最小化传输**: 只传输必要的信息到 HIBP API

### 错误处理

- **网络错误**: 优雅处理网络连接问题
- **API 错误**: 处理各种 HTTP 状态码
- **限速错误**: 自动处理 429 状态码
- **用户反馈**: 清晰的错误信息和建议

## 最佳实践

### 1. 密码要求

- 最小长度: 8 字符
- 包含大小写字母、数字和特殊字符
- 避免常见密码和模式
- 定期更换密码

### 2. 用户体验

- 实时显示密码强度
- 提供具体的改善建议
- 避免过于严格的限制
- 清晰的错误信息

### 3. 性能优化

- 延迟 HIBP 检查，避免频繁请求
- 缓存验证结果
- 智能限速处理
- 异步处理长时间操作

## 故障排除

### 常见问题

1. **HIBP API 检查失败**
   - 检查网络连接
   - 验证 API 密钥
   - 检查限速设置

2. **密码强度检查不准确**
   - 确保使用最新版本的 zxcvbn
   - 检查语言包配置
   - 验证输入数据格式

3. **性能问题**
   - 调整限速配置
   - 减少不必要的检查
   - 优化组件渲染

### 调试信息

```typescript
import { getHIBPStatus } from '../config/hibp';

const status = getHIBPStatus();
console.log('HIBP 状态:', status);
```

## 更新日志

### v1.0.0
- 集成 zxcvbn 密码强度检查
- 添加 HIBP API 支持
- 实现智能限速处理
- 创建用户友好的界面组件

## 技术支持

如有问题或建议，请参考：

- [zxcvbn 官方文档](https://github.com/dropbox/zxcvbn)
- [HIBP API 文档](https://haveibeenpwned.com/API/v3)
- [项目 Issues](https://github.com/your-repo/issues)
