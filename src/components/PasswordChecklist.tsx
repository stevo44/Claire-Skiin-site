import React, { useMemo } from 'react';
import { getPasswordChecks, isPasswordValid, passwordsMatch } from '../lib/passwordRules';

/**
 * Reusable real-time password validation checklist.
 *
 * Used by BOTH RegisterPage and ResetPasswordPage — same component, same
 * rules, same behaviour. The rules come from src/lib/passwordRules.ts,
 * which is the single source of truth also imported by the backend Joi
 * schemas in validation.middleware.ts.
 *
 * @param password     — current password string (updates on every keystroke)
 * @param confirmPassword — current confirm string (updates on every keystroke)
 * @param onValidChange — optional callback that fires when the overall
 *                       validity changes (all rules pass AND passwords match).
 *                       Used by parent forms to enable/disable the submit
 *                       button without re-implementing the check.
 */
interface PasswordChecklistProps {
  password: string;
  confirmPassword: string;
  onValidChange?: (allValid: boolean) => void;
}

export default function PasswordChecklist({
  password,
  confirmPassword,
  onValidChange,
}: PasswordChecklistProps) {
  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const allRulesPass = useMemo(() => isPasswordValid(password), [password]);
  const match = useMemo(
    () => passwordsMatch(password, confirmPassword),
    [password, confirmPassword]
  );
  const allValid = allRulesPass && match;

  // Notify parent whenever the overall validity changes.
  React.useEffect(() => {
    onValidChange?.(allValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allValid]);

  // Only render once the user has started typing — an empty form shouldn't
  // show a wall of red ✗ marks.
  const showChecklist = password.length > 0;
  const showMatch = confirmPassword.length > 0;

  if (!showChecklist && !showMatch) return null;

  return (
    <div className="mt-4 space-y-3">
      {showChecklist && (
        <ul className="space-y-1.5">
          {checks.map(c => (
            <li
              key={c.id}
              className={`flex items-center gap-2 text-xs transition-colors ${
                c.passed ? 'text-green-700' : 'text-on-surface-variant'
              }`}
            >
              <span
                className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 ${
                  c.passed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-stone-100 text-stone-400'
                }`}
              >
                {c.passed ? '✓' : '✗'}
              </span>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      {showMatch && (
        <div
          className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
            match ? 'text-green-700' : 'text-error'
          }`}
        >
          <span
            className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 ${
              match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-error'
            }`}
          >
            {match ? '✓' : '✗'}
          </span>
          <span>{match ? 'Passwords match' : 'Passwords do not match'}</span>
        </div>
      )}
    </div>
  );
}
