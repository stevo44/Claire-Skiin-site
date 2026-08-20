/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  SINGLE SOURCE OF TRUTH for password validation rules                    │
 * │                                                                          │
 *  Backend enforcement: src/backend/middleware/validation.middleware.ts
 *  uses PASSWORD_MIN_LENGTH and PASSWORD_PATTERN in Joi schemas for
 *  `register` and `resetPassword`.
 *
 *  Frontend checklist: src/components/PasswordChecklist.tsx
 *  uses PASSWORD_RULES (individual test functions) for real-time UI feedback.
 *
 *  If you change a rule here, BOTH backend and frontend update automatically.
 *  Never edit the Joi regex or the checklist tests in isolation.
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/** Minimum password length — enforced by both backend Joi and frontend checklist. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Combined regex used by the backend Joi `.pattern()` call.
 * Requires at least one lowercase, one uppercase, one digit, and one
 * special (non-alphanumeric) character. Used as a lookahead-only pattern
 * so Joi's `.test()` returns true when all four lookaheads pass.
 */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/;

export interface PasswordRule {
  id: string;
  label: string;
  /** Returns true when the rule is satisfied. */
  test: (password: string) => boolean;
}

/**
 * Individual rule definitions. The frontend checklist iterates this array
 * to render one row per rule with a live pass/fail indicator.
 *
 * These tests mirror exactly what PASSWORD_PATTERN enforces on the backend.
 * Do not add or remove a test here without updating PASSWORD_PATTERN above
 * (and vice versa).
 */
export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length',    label: `At least ${PASSWORD_MIN_LENGTH} characters`,     test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { id: 'uppercase', label: 'At least one uppercase letter (A–Z)',           test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'At least one lowercase letter (a–z)',           test: (p) => /[a-z]/.test(p) },
  { id: 'number',    label: 'At least one number (0–9)',                     test: (p) => /[0-9]/.test(p) },
  { id: 'symbol',    label: 'At least one special character (!@#$…)',        test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Returns one object per rule with the current pass/fail state. */
export function getPasswordChecks(password: string): { id: string; label: string; passed: boolean }[] {
  return PASSWORD_RULES.map(r => ({ id: r.id, label: r.label, passed: r.test(password) }));
}

/** True when every password rule passes. */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every(r => r.test(password));
}

/** True when the confirm field matches the password and the password is non-empty. */
export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}
