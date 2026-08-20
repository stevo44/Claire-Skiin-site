/**
 * Cameroon Mobile Money phone-number validation utilities.
 *
 * Source for prefix ranges: DusuPay API documentation
 * (https://developer.dusuupay.com/utility-functions/mobile-money-operator-prefixes)
 * — a payment-gateway reference that specifically routes MoMo charges
 * based on these prefixes. Cross-verified against sent.dm and
 * StackOverflow community answers for Cameroon numbering.
 *
 * Cameroon mobile numbers are 9 digits (after stripping the country code).
 * The first 2–3 digits identify the operator / mobile-money provider.
 *
 *   MTN Mobile Money:  67, 68, 650, 651, 652, 653, 654
 *   Orange Money:      69, 655, 656, 657, 658, 659
 */

export type MoMoProvider = 'mtn' | 'orange';

/**
 * Prefixes for each provider, stored as 2- or 3-digit strings.
 * Checked against the *local* 9-digit number (no country code).
 */
const PREFIXES: Record<MoMoProvider, string[]> = {
  mtn:    ['67', '68', '650', '651', '652', '653', '654'],
  orange: ['69', '655', '656', '657', '658', '659'],
};

/**
 * Normalise any Cameroon phone input to the 9-digit local number.
 *
 *   "+237 672 345 678"  → "672345678"
 *   "237672345678"      → "672345678"
 *   "0672345678"         → "672345678"   (strips leading 0 from 10-digit form)
 *   "672345678"          → "672345678"
 */
export function normalizeCmPhone(input: string): string {
  if (!input) return '';
  let clean = input.replace(/\D/g, '');
  // Strip leading 0 from 10-digit local format (some users type 06XX…)
  if (clean.startsWith('0') && clean.length === 10) {
    clean = clean.substring(1);
  }
  // Strip 237 country code if present
  if (clean.startsWith('237') && clean.length === 12) {
    clean = clean.substring(3);
  }
  return clean;
}

/**
 * Convert any Cameroon phone input to international Fapshi format
 * (237 + 9 digits, no `+`).
 */
export function formatForFapshi(input: string): string {
  const local = normalizeCmPhone(input);
  if (local.length !== 9) return input.replace(/[\s\-().]/g, ''); // fallback: raw strip
  return '237' + local;
}

/**
 * Determine which MoMo provider a number belongs to.
 * Returns `null` if the number doesn't match any known MoMo prefix.
 */
export function getMoMoProvider(input: string): MoMoProvider | null {
  const local = normalizeCmPhone(input);
  if (local.length !== 9) return null;

  // Check 3-digit prefixes first (651, 655, etc.) before 2-digit (67, 68, 69)
  const p3 = local.substring(0, 3);
  const p2 = local.substring(0, 2);

  for (const [provider, prefixes] of Object.entries(PREFIXES)) {
    if (prefixes.includes(p3) || prefixes.includes(p2)) {
      return provider as MoMoProvider;
    }
  }
  return null;
}

/**
 * Validate that a number matches the expected prefix range for the
 * selected provider.
 *
 * Returns `{ valid: true }` on match, or `{ valid: false, message }`
 * with a human-readable error for inline display.
 */
export function validateMoMoNumber(
  input: string,
  provider: MoMoProvider
): { valid: boolean; message?: string } {
  const local = normalizeCmPhone(input);
  if (local.length === 0) {
    return { valid: false, message: 'Please enter your mobile money number.' };
  }
  if (local.length !== 9) {
    return { valid: false, message: 'Enter a valid 9-digit Cameroon number (e.g. 6XX XXX XXX).' };
  }

  const detected = getMoMoProvider(local);
  if (detected === null) {
    return { valid: false, message: 'This number does not match any known Cameroon mobile money prefix.' };
  }
  if (detected !== provider) {
    const expectedName = provider === 'mtn' ? 'MTN Mobile Money' : 'Orange Money';
    const detectedName = detected === 'mtn' ? 'MTN' : 'Orange';
    return {
      valid: false,
      message: `This number has an ${detectedName} prefix but you selected ${expectedName}. Please switch the payment method or use a matching number.`,
    };
  }
  return { valid: true };
}
