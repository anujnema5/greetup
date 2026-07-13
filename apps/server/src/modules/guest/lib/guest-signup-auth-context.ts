import type { GuestSignupMergeContext } from "../types/guest-signup.types";

/** Key on Better Auth `ctx.context` set during register when a guest merge is pending. */
export const GUEST_SIGNUP_MERGE_CONTEXT_KEY = "guestSignupMergeCandidate";

export type GuestSignupAuthPluginContext = {
  [GUEST_SIGNUP_MERGE_CONTEXT_KEY]?: GuestSignupMergeContext;
};

export function setGuestSignupMergeCandidate(
  context: GuestSignupAuthPluginContext,
  candidate: GuestSignupMergeContext,
): void {
  context[GUEST_SIGNUP_MERGE_CONTEXT_KEY] = candidate;
}

export function getGuestSignupMergeCandidate(
  context: GuestSignupAuthPluginContext | undefined,
): GuestSignupMergeContext | null {
  return context?.[GUEST_SIGNUP_MERGE_CONTEXT_KEY] ?? null;
}

export function clearGuestSignupMergeCandidate(context: GuestSignupAuthPluginContext | undefined): void {
  if (!context) {
    return;
  }
  delete context[GUEST_SIGNUP_MERGE_CONTEXT_KEY];
}
