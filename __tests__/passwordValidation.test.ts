import { DEFAULT_PASSWORD_REQUIREMENTS, validatePassword } from '../utils/passwordValidation';

describe('Password Validation', () => {
  describe('validatePassword', () => {
    it('应该拒绝过短的密码', () => {
      const result = validatePassword('123', DEFAULT_PASSWORD_REQUIREMENTS);
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
    });

    it('应该拒绝只包含数字的密码', () => {
      const result = validatePassword('12345678', DEFAULT_PASSWORD_REQUIREMENTS);
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(2);
    });

    it('应该接受强密码', () => {
      const result = validatePassword('StrongP@ss123', DEFAULT_PASSWORD_REQUIREMENTS);
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(2);
    });

    it('应该提供改善建议', () => {
      const result = validatePassword('weak', DEFAULT_PASSWORD_REQUIREMENTS);
      expect(result.feedback.suggestions.length).toBeGreaterThan(0);
    });

    it('应该检查字符类型要求', () => {
      const result = validatePassword('password123', DEFAULT_PASSWORD_REQUIREMENTS);
      expect(result.isValid).toBe(false);
      expect(result.feedback.suggestions.some(s => s.includes('大寫字母'))).toBe(true);
      expect(result.feedback.suggestions.some(s => s.includes('特殊字符'))).toBe(true);
    });
  });

  describe('DEFAULT_PASSWORD_REQUIREMENTS', () => {
    it('应该有正确的默认配置', () => {
      expect(DEFAULT_PASSWORD_REQUIREMENTS.minLength).toBe(8);
      expect(DEFAULT_PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
      expect(DEFAULT_PASSWORD_REQUIREMENTS.requireLowercase).toBe(true);
      expect(DEFAULT_PASSWORD_REQUIREMENTS.requireNumbers).toBe(true);
      expect(DEFAULT_PASSWORD_REQUIREMENTS.requireSpecialChars).toBe(true);
      expect(DEFAULT_PASSWORD_REQUIREMENTS.minScore).toBe(2);
    });
  });

  describe('密码强度评分', () => {
    it('应该正确评估常见弱密码', () => {
      const weakPasswords = ['123456', 'password', 'qwerty', 'abc123'];
      weakPasswords.forEach(password => {
        const result = validatePassword(password, DEFAULT_PASSWORD_REQUIREMENTS);
        expect(result.score).toBeLessThan(2);
      });
    });

    it('应该正确评估强密码', () => {
      const strongPasswords = [
        'MySecureP@ss123!',
        'ComplexP@ssw0rd#2024',
        'Str0ng!P@ssw0rd'
      ];
      strongPasswords.forEach(password => {
        const result = validatePassword(password, DEFAULT_PASSWORD_REQUIREMENTS);
        expect(result.score).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理空密码', () => {
      const result = validatePassword('', DEFAULT_PASSWORD_REQUIREMENTS);
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
    });

    it('应该处理特殊字符', () => {
      const result = validatePassword('Test@123', DEFAULT_PASSWORD_REQUIREMENTS);
      expect(result.isValid).toBe(true);
    });
  });
});
