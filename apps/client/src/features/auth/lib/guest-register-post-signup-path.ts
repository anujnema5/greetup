import type { SignupMergeContext } from "@/features/guest-try/api/guest-try.api";

/** Where to send the user right after signup when a guest session will merge. */
export function getGuestRegisterPostSignupPath(
  context: SignupMergeContext | null | undefined,
): string {
  if (context?.mergeAvailable) {
    return "/profile-setup?from=guest";
  }
  return "/profile-setup";
}

/** Better Auth email-verification / OAuth callback when guest merge is expected. */
export function getGuestRegisterAuthCallbackUrl(
  context: SignupMergeContext | null | undefined,
): string {
  const path = getGuestRegisterPostSignupPath(context);
  return `${typeof window !== "undefined" ? window.location.origin : ""}${path}`;
}
