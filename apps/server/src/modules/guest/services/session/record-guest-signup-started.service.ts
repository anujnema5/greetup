import { guestTrialEventsRepository } from "../../repositories/guest-trial-events.repository";
import type { GuestSignupMergeContext, GuestSignupRegisterProvider } from "../../types/guest-signup.types";
import { logGuestTrialEvent } from "../audit/log-guest-trial-event.service";

/**
 * Audit when a guest with an active session begins full signup (once per guest user).
 */
export async function recordGuestSignupStartedOnce(
  mergeContext: Pick<GuestSignupMergeContext, "guestUserId" | "deviceHash" | "ipHash">,
  metadata: {
    provider?: GuestSignupRegisterProvider;
    source?: string;
  } = {},
): Promise<void> {
  const alreadyLogged = await guestTrialEventsRepository.hasEvent(
    mergeContext.guestUserId,
    "guest_signup_started",
  );
  if (alreadyLogged) {
    return;
  }

  await logGuestTrialEvent({
    guestUserId: mergeContext.guestUserId,
    eventType: "guest_signup_started",
    deviceHash: mergeContext.deviceHash,
    ipHash: mergeContext.ipHash,
    metadata,
  });
}
