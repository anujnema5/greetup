import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import type { PhoneOtpSessionResult } from "@/features/auth/types";

const { AUTH } = API_ENDPOINTS;

/** Request an SMS OTP for sign-in / sign-up (server generates + sends via AWS SNS). */
export async function startPhoneOtp(phone: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(AUTH.PHONE_OTP_START, {
    method: "POST",
    body: JSON.stringify({ phone: phone.trim() }),
  });
}

/** Verify the OTP and establish a Better Auth session (sets the session cookie). */
export async function verifyPhoneOtp(
  phone: string,
  code: string,
  name?: string,
): Promise<PhoneOtpSessionResult> {
  return apiFetch<PhoneOtpSessionResult>(AUTH.PHONE_OTP_VERIFY, {
    method: "POST",
    body: JSON.stringify({
      phone: phone.trim(),
      code: code.trim(),
      ...(name?.trim() ? { name: name.trim() } : {}),
    }),
  });
}

/** Request an SMS OTP to verify a signed-in user's new number (Settings). */
export async function startPhoneOtpUpdate(phone: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(AUTH.PHONE_OTP_UPDATE_START, {
    method: "POST",
    body: JSON.stringify({ phone: phone.trim() }),
  });
}

/** Verify the OTP and set the new number on the current session user (Settings). */
export async function verifyPhoneOtpUpdate(
  phone: string,
  code: string,
): Promise<{ user: Record<string, unknown> }> {
  return apiFetch<{ user: Record<string, unknown> }>(AUTH.PHONE_OTP_UPDATE_VERIFY, {
    method: "POST",
    body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
  });
}
