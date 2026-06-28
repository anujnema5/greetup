import type { InferSelectModel } from "drizzle-orm";

import type { rooms } from "@/core/database/schema";
import { SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES } from "@/modules/rooms/constants/session/scheduled-space-join-grace";
import { SCHEDULED_EMPTY_ROOM_GRACE_MS } from "@/modules/rooms/constants/session/room-session-limits";
import {
  computeCalendarEndForScheduledRoom,
  computeIsExpired,
  isLiveSessionCapExceeded,
  isPastDeadline,
} from "@/modules/rooms/lib/expiry/room-expiry";
import type { RoomSessionEndReason } from "@/modules/rooms/types";
import { coerceRoomDate } from "@/modules/rooms/lib/session/coerce-room-date";

export type RoomRowForReconcile = Pick<
  InferSelectModel<typeof rooms>,
  | "id"
  | "roomType"
  | "status"
  | "startedAt"
  | "scheduledStartAt"
  | "scheduledEndAt"
  | "expiresAt"
  | "isExpired"
  | "advancedOptions"
>;

export type ParticipantPresence = {
  activeCount: number;
  lastLeftAt: Date | null;
};

function joinGraceDeadline(scheduledStartAt: Date): Date {
  return new Date(
    scheduledStartAt.getTime() + SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES * 60_000,
  );
}

/**
 * Returns the first matching end reason, or null if access may proceed without teardown.
 */
export function evaluateRoomSessionEndReason(
  room: RoomRowForReconcile,
  presence: ParticipantPresence,
  now: Date = new Date(),
): RoomSessionEndReason | null {
  if (room.status === "scheduled" && room.roomType === "space" && room.scheduledStartAt) {
    if (now.getTime() >= joinGraceDeadline(room.scheduledStartAt).getTime()) {
      return "join_grace_missed";
    }
  }

  if (room.status !== "live") {
    return null;
  }

  if (room.isExpired || computeIsExpired(room.expiresAt, now)) {
    return "expires_at_past";
  }

  if (room.startedAt && isLiveSessionCapExceeded(room.startedAt, room.roomType, now)) {
    return "session_cap";
  }

  if (room.roomType === "space" && room.scheduledStartAt) {
    const calendarEnd = computeCalendarEndForScheduledRoom({
      scheduledStartAt: room.scheduledStartAt,
      scheduledEndAt: room.scheduledEndAt,
      advancedOptions: room.advancedOptions,
    });
    if (isPastDeadline(calendarEnd, now)) {
      return "calendar_end";
    }
  }

  if (presence.activeCount === 0) {
    if (room.scheduledStartAt && now.getTime() < room.scheduledStartAt.getTime()) {
      return null;
    }

    const emptySince = coerceRoomDate(presence.lastLeftAt ?? room.startedAt);
    if (emptySince && now.getTime() - emptySince.getTime() >= SCHEDULED_EMPTY_ROOM_GRACE_MS) {
      return "empty_room_2h";
    }
  }

  return null;
}

export function roomSessionClosedMessage(reason: RoomSessionEndReason | null): string {
  switch (reason) {
    case "empty_room_2h":
      return "This space has ended — no one has been in the call for over 2 hours.";
    case "session_cap":
      return "This call has reached its time limit.";
    case "calendar_end":
      return "This scheduled meeting has ended.";
    case "join_grace_missed":
      return "This scheduled space is no longer available.";
    case "expires_at_past":
      return "This room session is no longer available.";
    case "reconciled_on_access":
      return "This room session is no longer available.";
    default:
      return "This room session is no longer available.";
  }
}
