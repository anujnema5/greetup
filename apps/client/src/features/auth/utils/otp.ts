/** Strip non-digits for Firebase `confirmation.confirm` (SMS codes are numeric). */
export function digitsOnlyOtp(code: string): string {
  return code.replace(/\D/g, "");
}
