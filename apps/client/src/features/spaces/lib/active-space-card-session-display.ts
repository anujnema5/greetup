import type { ActiveSpaceItem } from "../types/spaces-api.types";
import { isClientStillBeforeScheduledStart } from "@/lib/datetime/scheduled-start-guards";

/**
 * Active space cards use this instead of raw `status === "live"` for chrome (LIVE pill, “Ongoing”).
 *
 * After “Start now”, the row is `live` in the API. If everyone leaves before the calendar
 * `scheduledStartAt`, we still show **scheduled** chrome until the slot time or someone rejoins.
 */
export function activeSpaceCardShowsLiveSession(space: ActiveSpaceItem): boolean {
  if (space.status !== "live") return false;

  const earlyEmptySlot =
    Boolean(space.scheduledStartAt) &&
    isClientStillBeforeScheduledStart(space.scheduledStartAt) &&
    space.participantCount === 0;

  return !earlyEmptySlot;
}

/** Host may edit title/time/invites until the space is an ongoing live session. */
export function activeSpaceHostCanEditSchedule(space: ActiveSpaceItem): boolean {
  if (!space.scheduledStartAt) return false;
  if (space.status === "scheduled") return true;
  return space.status === "live" && !activeSpaceCardShowsLiveSession(space);
}
