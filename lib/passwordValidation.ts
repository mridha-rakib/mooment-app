/**
 * Approved signup password complexity rules. Keep this list in sync with the
 * backend copy in `xenog-api/src/modules/auth/password.schema.ts` (same rules,
 * same order).
 */
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = "minLength" | "lowercase" | "uppercase" | "number" | "special";

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  test: (value: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "minLength", label: "At least 8 characters", test: (value) => value.length >= PASSWORD_MIN_LENGTH },
  { id: "lowercase", label: "One lowercase letter", test: (value) => /[a-z]/.test(value) },
  { id: "uppercase", label: "One uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { id: "number", label: "One number", test: (value) => /[0-9]/.test(value) },
  { id: "special", label: "One special character", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export const PASSWORD_RULE_ERRORS: Record<PasswordRuleId, string> = {
  minLength: "Password must be at least 8 characters.",
  lowercase: "Password must include at least one lowercase letter.",
  uppercase: "Password must include at least one uppercase letter.",
  number: "Password must include at least one number.",
  special: "Password must include at least one special character.",
};

export type PasswordRuleStatus = {
  id: PasswordRuleId;
  label: string;
  met: boolean;
};

/** Live status of every rule, for the inline checklist under the password field. */
export const getPasswordRuleChecklist = (value: string): PasswordRuleStatus[] =>
  PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(value) }));

/** First unmet rule's error message, or null when the password satisfies every rule. */
export const getFirstPasswordError = (value: string): string | null => {
  const failingRule = PASSWORD_RULES.find((rule) => !rule.test(value));

  return failingRule ? PASSWORD_RULE_ERRORS[failingRule.id] : null;
};

export const isPasswordValid = (value: string): boolean =>
  PASSWORD_RULES.every((rule) => rule.test(value));
