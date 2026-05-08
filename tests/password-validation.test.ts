import assert from "node:assert/strict";
import test from "node:test";

import {
  checkCommonPatterns,
  checkPasswordRequirements,
} from "../utils/passwordValidation";

test("checkPasswordRequirements accepts the current registration password policy", () => {
  const result = checkPasswordRequirements("P@ssword123");

  assert.equal(result.isValid, true);
  assert.deepEqual(result.missingRequirements, []);
  assert.equal(result.details.hasMinLength, true);
  assert.equal(result.details.hasUppercase, true);
  assert.equal(result.details.hasLowercase, true);
  assert.equal(result.details.hasNumbers, true);
  assert.equal(result.details.hasSpecialChars, true);
});

test("checkPasswordRequirements reports missing requirements in user-facing terms", () => {
  const result = checkPasswordRequirements("password");

  assert.equal(result.isValid, false);
  assert.equal(result.missingRequirements.includes("大寫字母"), true);
  assert.equal(result.missingRequirements.includes("數字"), true);
  assert.equal(result.missingRequirements.includes("特殊字符"), true);
  assert.equal(result.errorMessage, "密碼需要包含: 大寫字母, 數字, 特殊字符");
});

test("checkCommonPatterns catches weak password patterns", () => {
  const warnings = checkCommonPatterns("password123");

  assert.equal(warnings.includes("避免常見鍵盤序列"), true);
  assert.equal(warnings.includes("避免常見弱密碼"), true);
});
