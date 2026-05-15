import type { ActiveCircleItem } from "../types/circles-api.types";
import { isClientStillBeforeScheduledStart } from "@/lib/datetime/scheduled-start-guards";

/**
 * Active Circles cards use this instead of raw `status === "live"` for chrome (LIVE pill, “Ongoing”).
 *
 * After “Start now”, the row is `live` in the API. If everyone leaves before the calendar
 * `scheduledStartAt`, we still show **scheduled** chrome until the slot time or someone rejoins.
 */
export function activeCircleCardShowsLiveSession(circle: ActiveCircleItem): boolean {
  if (circle.status !== "live") return false;

  const earlyEmptySlot =
    Boolean(circle.scheduledStartAt) &&
    isClientStillBeforeScheduledStart(circle.scheduledStartAt) &&
    circle.participantCount === 0;

  return !earlyEmptySlot;
}
