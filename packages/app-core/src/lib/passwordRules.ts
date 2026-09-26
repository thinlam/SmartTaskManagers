export interface PasswordRule {
  key: string;
  labelKey: string;
  test: (password: string) => boolean;
}

/** Mirrors the backend's PasswordPolicy regex in AuthController.cs exactly — keep both in sync. */
export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', labelKey: 'auth.passwordRuleLength', test: (p) => p.length >= 8 },
  { key: 'uppercase', labelKey: 'auth.passwordRuleUppercase', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', labelKey: 'auth.passwordRuleLowercase', test: (p) => /[a-z]/.test(p) },
  { key: 'number', labelKey: 'auth.passwordRuleNumber', test: (p) => /\d/.test(p) },
];
