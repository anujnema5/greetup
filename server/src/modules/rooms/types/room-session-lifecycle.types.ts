/**
 * Session end / join-time reconcile (Part C — implement in services layer).
 */

export type RoomSessionEndReason =
  | "host_end_for_everyone"
  | "expires_at_past"
  | "join_grace_missed"
  | "session_cap"
  | "calendar_end"
  | "empty_room_2h"
  | "delete_circle_after_call"
  | "match_finalized"
  | "connection_call_ended"
  | "reconciled_on_access";

export type EndLiveRoomSessionOptions = {
  /**
   * Circle with `scheduled_start_at`: return to `scheduled` and reactivate host row
   * (calendar slot kept). Default: true for calendar circles except `delete_circle_after_call`.
   */
  preserveScheduledSlot?: boolean;
  /** Notify non-host circle participants to leave RTC (uses `hostEndedForEveryone` event). */
  notifyParticipants?: boolean;
  /** When notifying, skip this user id (e.g. host who triggered end). */
  excludeUserIdFromNotify?: string;
};

export type EndLiveRoomSessionResult = {
  ended: boolean;
  alreadyClosed: boolean;
  reason: RoomSessionEndReason;
};

export type ReconcileRoomSessionResult = {
  closed: boolean;
  alreadyWasClosed: boolean;
  reason: RoomSessionEndReason | null;
};

export type SweepDueRoomSessionsOptions = {
  /** Max candidate rooms per run (each runs full reconcile). */
  maxRooms?: number;
};

export type SweepDueRoomSessionsResult = {
  candidates: number;
  ended: number;
  roomIds: string[];
};
