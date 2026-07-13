import { GUEST_CALL_MAX_DURATION_MS } from "../constants/guest-trial.constants";

/** Wall-clock deadline for a live direct match room that includes a guest participant. */
export function computeGuestMatchRoomSessionExpiresAt(liveStartedAt: Date): Date {
  return new Date(liveStartedAt.getTime() + GUEST_CALL_MAX_DURATION_MS);
}
