import { zxcvbn } from '@zxcvbn-ts/core';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  feedback: {
    warning?: string;
    suggestions: string[];
  };
  crackTime: string;
  strength: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minScore: number;
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minScore: 2, // 至少需要 "一般" 强度
};

export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordValidationResult {
  // 基础长度检查
  if (password.length < requirements.minLength) {
    return {
      isValid: false,
      score: 0,
      feedback: {
        suggestions: [`密碼長度至少需要 ${requirements.minLength} 個字符`],
      },
      crackTime: '立即',
      strength: 'very_weak',
    };
  }

  // 使用 zxcvbn 进行强度评估
  const result = zxcvbn(password);
  
  // 检查字符类型要求
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const missingRequirements: string[] = [];
  
  if (requirements.requireUppercase && !hasUppercase) {
    missingRequirements.push('大寫字母');
  }
  if (requirements.requireLowercase && !hasLowercase) {
    missingRequirements.push('小寫字母');
  }
  if (requirements.requireNumbers && !hasNumbers) {
    missingRequirements.push('數字');
  }
  if (requirements.requireSpecialChars && !hasSpecialChars) {
    missingRequirements.push('特殊字符');
  }

  // 如果缺少必需字符类型，降低评分
  let adjustedScore = result.score;
  if (missingRequirements.length > 0) {
    adjustedScore = Math.max(0, adjustedScore - 1) as typeof result.score;
  }

  // 检查是否满足最低强度要求
  const meetsScoreRequirement = adjustedScore >= requirements.minScore;
  
  // 构建反馈信息
  const suggestions = [...result.feedback.suggestions];
  if (missingRequirements.length > 0) {
    suggestions.unshift(`建議包含: ${missingRequirements.join(', ')}`);
  }

  const strengthLabels: ('very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong')[] = [
    'very_weak', 'weak', 'fair', 'strong', 'very_strong'
  ];

  return {
    isValid: meetsScoreRequirement && missingRequirements.length === 0,
    score: adjustedScore,
    feedback: {
      warning: result.feedback.warning || undefined,
      suggestions,
    },
    crackTime: result.crackTimesDisplay.offlineFastHashing1e10PerSecond,
    strength: strengthLabels[adjustedScore] || 'very_weak',
  };
}

export function getPasswordStrengthColor(score: number): string {
  const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#16A34A'];
  return colors[score] || colors[0];
}

export function getPasswordStrengthLabel(score: number): string {
  const labels = ['非常弱', '弱', '一般', '強', '非常強'];
  return labels[score] || labels[0];
}

// 用于 Zod 验证的自定义验证函数
export function createPasswordValidator(requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS) {
  return (password: string) => {
    const validation = validatePassword(password, requirements);
    return validation.isValid;
  };
}

// 获取密码建议
export function getPasswordSuggestions(password: string): string[] {
  const result = zxcvbn(password);
  return result.feedback.suggestions;
}

// 新增：详细的密码要求检查函数
export function checkPasswordRequirements(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): {
  isValid: boolean;
  missingRequirements: string[];
  errorMessage: string | null;
  details: {
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
  };
} {
  // 检查各种字符类型要求
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const hasMinLength = password.length >= requirements.minLength;

  const missingRequirements: string[] = [];
  
  if (!hasMinLength) {
    missingRequirements.push(`至少${requirements.minLength}個字符`);
  }
  if (requirements.requireUppercase && !hasUppercase) {
    missingRequirements.push("大寫字母");
  }
  if (requirements.requireLowercase && !hasLowercase) {
    missingRequirements.push("小寫字母");
  }
  if (requirements.requireNumbers && !hasNumbers) {
    missingRequirements.push("數字");
  }
  if (requirements.requireSpecialChars && !hasSpecialChars) {
    missingRequirements.push("特殊字符");
  }

  const isValid = missingRequirements.length === 0;
  
  let errorMessage: string | null = null;
  if (!isValid) {
    if (!hasMinLength) {
      errorMessage = `密碼至少需要${requirements.minLength}個字符`;
    } else {
      errorMessage = `密碼需要包含: ${missingRequirements.join(", ")}`;
    }
  }

  return {
    isValid,
    missingRequirements,
    errorMessage,
    details: {
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumbers,
      hasSpecialChars,
    },
  };
}

// 新增：完整的密码验证函数，整合所有检查逻辑
export function validatePasswordComplete(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): {
  isValid: boolean;
  score: number;
  feedback: {
    warning?: string;
    suggestions: string[];
  };
  crackTime: string;
  strength: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  requirementsCheck: ReturnType<typeof checkPasswordRequirements>;
} {
  // 首先检查基础要求
  const requirementsCheck = checkPasswordRequirements(password, requirements);
  
  // 如果基础要求不满足，直接返回结果
  if (!requirementsCheck.isValid) {
    return {
      isValid: false,
      score: 0,
      feedback: {
        suggestions: [requirementsCheck.errorMessage!],
      },
      crackTime: '立即',
      strength: 'very_weak',
      requirementsCheck,
    };
  }

  // 使用 zxcvbn 进行强度评估
  const result = zxcvbn(password);
  
  // 检查是否满足最低强度要求
  const meetsScoreRequirement = result.score >= requirements.minScore;
  
  const strengthLabels: ('very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong')[] = [
    'very_weak', 'weak', 'fair', 'strong', 'very_strong'
  ];

  return {
    isValid: meetsScoreRequirement,
    score: result.score,
    feedback: {
      warning: result.feedback.warning || undefined,
      suggestions: result.feedback.suggestions,
    },
    crackTime: result.crackTimesDisplay.offlineFastHashing1e10PerSecond,
    strength: strengthLabels[result.score] || 'very_weak',
    requirementsCheck,
  };
}

// 检查密码是否包含常见弱密码模式
export function checkCommonPatterns(password: string): string[] {
  const patterns: { pattern: RegExp; message: string }[] = [
    { pattern: /(.)\1{2,}/, message: '避免重複字符序列' },
    { pattern: /(123|abc|qwe|asd|zxc)/i, message: '避免常見鍵盤序列' },
    { pattern: /(password|123456|qwerty)/i, message: '避免常見弱密碼' },
    { pattern: /^(.+)\1$/, message: '避免重複整個密碼' },
  ];

  const warnings: string[] = [];
  patterns.forEach(({ pattern, message }) => {
    if (pattern.test(password)) {
      warnings.push(message);
    }
  });

  return warnings;
}
