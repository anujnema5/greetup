import {
  getGuestSignupMergeCandidate,
  setGuestSignupMergeCandidate,
  type GuestSignupAuthPluginContext,
} from "../../lib/guest-signup-auth-context";
import type { GuestSignupMergeContext, GuestSignupRegisterProvider } from "../../types/guest-signup.types";
import { recordGuestSignupStartedOnce } from "./record-guest-signup-started.service";
import { resolveGuestSignupMergeContext } from "./resolve-guest-signup-merge-context.service";

export type DetectGuestSignupOnRegisterInput = {
  headers: Headers | undefined | null;
  provider: GuestSignupRegisterProvider;
  authPluginContext?: GuestSignupAuthPluginContext;
  metadata?: Record<string, unknown>;
};

/**
 * Detects an active guest session during email / Google / phone registration.
 * Logs `guest_signup_started` once and stashes merge context on Better Auth plugin context.
 */
export async function detectGuestSignupOnRegister(
  input: DetectGuestSignupOnRegisterInput,
): Promise<GuestSignupMergeContext | null> {
  const mergeContext = await resolveGuestSignupMergeContext(input.headers);
  if (!mergeContext) {
    return null;
  }

  await recordGuestSignupStartedOnce(mergeContext, {
    provider: input.provider,
    ...input.metadata,
  });

  if (input.authPluginContext) {
    setGuestSignupMergeCandidate(input.authPluginContext, mergeContext);
  }

  return mergeContext;
}

export { getGuestSignupMergeCandidate, setGuestSignupMergeCandidate };
