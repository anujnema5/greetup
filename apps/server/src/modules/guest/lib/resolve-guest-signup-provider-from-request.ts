import type { GuestSignupRegisterProvider } from "../types/guest-signup.types";

/** Best-effort provider label for Better Auth database hooks. */
export function resolveGuestSignupProviderFromRequestUrl(
  requestUrl: string | undefined,
): GuestSignupRegisterProvider {
  if (!requestUrl) {
    return "email";
  }

  const path = new URL(requestUrl).pathname.toLowerCase();
  if (path.includes("google") || path.includes("callback/google")) {
    return "google";
  }
  if (path.includes("phone")) {
    return "phone";
  }
  return "email";
}
