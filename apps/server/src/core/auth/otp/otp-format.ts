/** Strip everything but digits (mirrors the client `digitsOnlyOtp`). */
export function digitsOnlyOtp(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Minimal E.164 validation: leading `+`, country code starting 1-9, up to 15 digits total.
 * SNS silently drops malformed numbers (and may still bill), so reject before publishing.
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Normalize a user-entered number to E.164 for storage/lookup consistency: trim, drop spaces,
 * dashes and parens. A leading `00` international prefix becomes `+`. Returns null if the result
 * is not valid E.164 (callers must handle — never pass an unvalidated number to SNS).
 */
export function normalizeE164(raw: string): string | null {
  let s = raw.trim().replace(/[\s()\-.]/g, "");
  if (s.startsWith("00")) {
    s = `+${s.slice(2)}`;
  }
  return isValidE164(s) ? s : null;
}
