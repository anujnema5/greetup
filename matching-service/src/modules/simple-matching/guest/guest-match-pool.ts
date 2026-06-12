import type { SnapshotUserProfile } from "@/modules/simple-matching/types";
import { env } from "@/shared/config/env";

export type GuestMatchPoolPolicy = "guest_and_registered" | "guest_only";

export function resolveGuestMatchPoolPolicy(): GuestMatchPoolPolicy {
  return env.guestMatchPool;
}

export function isGuestSnapshot(snapshot: SnapshotUserProfile): boolean {
  return snapshot.attributes.isGuest === true;
}

/**
 * Launch (`guest_and_registered`): guests may match registered users and vice versa.
 * Strict (`guest_only`): guests pair only with guests; registered only with registered.
 */
export function areGuestPoolCompatible(
  requester: SnapshotUserProfile,
  candidate: SnapshotUserProfile,
  policy: GuestMatchPoolPolicy = resolveGuestMatchPoolPolicy(),
): boolean {
  if (policy === "guest_and_registered") {
    return true;
  }

  return isGuestSnapshot(requester) === isGuestSnapshot(candidate);
}
