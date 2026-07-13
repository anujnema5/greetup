import { GUEST_TRIAL_API_ERRORS } from "@/lib/copy/user-messages";

import { getApiErrorCode } from "./fetch-client";

/** Mirrors `server/src/shared/errors/api.errors.ts` guest codes. */
export const GUEST_TRY_API_ERROR_CODES = [
  "GUEST_TRIAL_EXHAUSTED",
  "GUEST_TRIAL_ALREADY_USED",
  "GUEST_RATE_LIMITED",
  "GUEST_NOT_ALLOWED",
  "GUEST_PROFILE_INCOMPLETE",
  "GUEST_SESSION_REQUIRED",
  "GUEST_SEARCH_RETRY_EXHAUSTED",
] as const;

export type GuestTryApiErrorCode = (typeof GUEST_TRY_API_ERROR_CODES)[number];

export type GuestTryApiErrorAction = "signup" | "retry" | "restart-guest";

const GUEST_TRY_ERROR_ACTIONS: Partial<Record<GuestTryApiErrorCode, GuestTryApiErrorAction>> = {
  GUEST_TRIAL_EXHAUSTED: "signup",
  GUEST_TRIAL_ALREADY_USED: "signup",
  GUEST_SEARCH_RETRY_EXHAUSTED: "signup",
  GUEST_RATE_LIMITED: "retry",
  GUEST_SESSION_REQUIRED: "restart-guest",
};

export function isGuestTryApiErrorCode(code: string | null | undefined): code is GuestTryApiErrorCode {
  if (!code) {
    return false;
  }
  return (GUEST_TRY_API_ERROR_CODES as readonly string[]).includes(code);
}

export function getGuestTryApiErrorAction(
  code: string | null | undefined,
): GuestTryApiErrorAction | null {
  if (!isGuestTryApiErrorCode(code)) {
    return null;
  }
  return GUEST_TRY_ERROR_ACTIONS[code] ?? null;
}

/** True when the UI should show the signup prompt instead of a generic error. */
export function shouldShowSignupPrompt(code: string | null | undefined): boolean {
  return getGuestTryApiErrorAction(code) === "signup";
}

export function getGuestTryApiErrorMessage(code: GuestTryApiErrorCode): string {
  return GUEST_TRIAL_API_ERRORS[code];
}

export function resolveGuestTryApiErrorMessage(error: unknown): string | null {
  const code = getApiErrorCode(error);
  if (!isGuestTryApiErrorCode(code)) {
    return null;
  }
  const mapped = GUEST_TRIAL_API_ERRORS[code];
  const serverMessage = getServerMessageFromError(error);
  return serverMessage ?? mapped;
}

function getServerMessageFromError(error: unknown): string | null {
  if (!(error && typeof error === "object" && "body" in error)) {
    return null;
  }
  const body = (error as { body?: unknown }).body;
  if (typeof body !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
      return parsed.message;
    }
  } catch {
    return null;
  }
  return null;
}
