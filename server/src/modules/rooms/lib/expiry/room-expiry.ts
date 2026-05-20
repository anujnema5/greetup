import { mergeRoomAdvancedOptions } from "@/core/database/schema";
import {
  CIRCLE_SESSION_MAX_MS,
  DIRECT_SESSION_MAX_MS,
} from "@/modules/rooms/constants/session/room-session-limits";
import type {
  CircleUpgradeExpiryParams,
  DbRoomSessionRow,
  RoomExpiryFields,
  RoomExpiryInputs,
  RoomExpirySource,
  RoomLiveSessionInputs,
  ScheduledCalendarEndInput,
} from "@/modules/rooms/types";

export type {
  CircleUpgradeExpiryParams,
  DbRoomSessionRow,
  RoomExpiryFields,
  RoomExpiryInputs,
  RoomExpirySource,
  RoomLiveSessionInputs,
  RoomDbStatus,
  ScheduledCalendarEndInput,
} from "@/modules/rooms/types";

/**
 * Circle **listing / join eligibility** time rules (Postgres `rooms.expires_at`, `is_expired`).
 *
 * - **Scheduled-only window:** {@link computeRoomExpiresAt} for `status === "scheduled"`.
 * - **Live rows:** {@link computeLiveSessionExpiresAt} (per-session cap + scheduled calendar end).
 * - **Session closed** for API guards: {@link isDbRoomSessionClosed}.
 */

function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

function addMs(d: Date, ms: number): Date {
  return new Date(d.getTime() + ms);
}

/** Scheduled booking end: explicit `scheduled_end_at` or start + `circleExpirationMinutes`. */
export function computeCalendarEndForScheduledRoom(
  input: ScheduledCalendarEndInput,
): Date | null {
  if (input.scheduledEndAt) {
    return input.scheduledEndAt;
  }
  const opts = mergeRoomAdvancedOptions(input.advancedOptions);
  const expMins = opts.circleExpirationMinutes;
  if (input.scheduledStartAt && typeof expMins === "number" && expMins > 0) {
    return addMinutes(input.scheduledStartAt, expMins);
  }
  return null;
}

/** Per-session cap from when the room went live (direct 2h, circle 3h). */
export function computeSessionCapDeadline(
  liveStartedAt: Date,
  roomType: RoomLiveSessionInputs["roomType"],
): Date {
  const capMs = roomType === "direct" ? DIRECT_SESSION_MAX_MS : CIRCLE_SESSION_MAX_MS;
  return addMs(liveStartedAt, capMs);
}

/**
 * Live `expires_at`: session cap; scheduled circles also capped by calendar end (whichever is sooner).
 */
export function computeLiveSessionExpiresAt(input: RoomLiveSessionInputs): Date | null {
  if (input.status !== "live" || !input.startedAt) {
    return computeRoomExpiresAt(input);
  }

  const sessionCap = computeSessionCapDeadline(input.startedAt, input.roomType);

  if (input.roomType === "direct" || !input.scheduledStartAt) {
    return sessionCap;
  }

  const calendarEnd = computeCalendarEndForScheduledRoom(input);
  if (!calendarEnd) {
    return sessionCap;
  }

  return new Date(Math.min(sessionCap.getTime(), calendarEnd.getTime()));
}

export function isPastDeadline(deadline: Date | null, now: Date = new Date()): boolean {
  return deadline != null && deadline.getTime() <= now.getTime();
}

export function isLiveSessionCapExceeded(
  liveStartedAt: Date,
  roomType: RoomLiveSessionInputs["roomType"],
  now: Date = new Date(),
): boolean {
  return isPastDeadline(computeSessionCapDeadline(liveStartedAt, roomType), now);
}

/** Listing deadline: `scheduledEndAt` and/or scheduled-start + `circleExpirationMinutes`. */
export function computeRoomExpiresAt(input: RoomExpiryInputs): Date | null {
  const opts = mergeRoomAdvancedOptions(input.advancedOptions);
  const expMins = opts.circleExpirationMinutes;
  const deadlines: Date[] = [];

  if (input.scheduledEndAt) {
    deadlines.push(input.scheduledEndAt);
  }

  if (
    input.status === "scheduled" &&
    input.scheduledStartAt &&
    typeof expMins === "number" &&
    expMins > 0
  ) {
    deadlines.push(addMinutes(input.scheduledStartAt, expMins));
  }

  if (deadlines.length === 0) return null;
  return new Date(Math.min(...deadlines.map((d) => d.getTime())));
}

export function computeIsExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  return expiresAt != null && expiresAt < now;
}

export function computeRoomExpiryFields(
  input: RoomExpiryInputs,
  now: Date = new Date(),
): RoomExpiryFields {
  const expiresAt = computeRoomExpiresAt(input);
  return { expiresAt, isExpired: computeIsExpired(expiresAt, now) };
}

export function computeLiveRoomExpiryFields(
  input: RoomLiveSessionInputs,
  now: Date = new Date(),
): RoomExpiryFields {
  const expiresAt = computeLiveSessionExpiresAt(input);
  return { expiresAt, isExpired: computeIsExpired(expiresAt, now) };
}

/** Single entry for repositories: scheduled rows vs live session caps. */
export function computeExpiryFieldsForRoom(
  room: RoomExpirySource,
  now: Date = new Date(),
): RoomExpiryFields {
  if (room.status === "live" && room.startedAt) {
    return computeLiveRoomExpiryFields(
      {
        status: "live",
        roomType: room.roomType,
        startedAt: room.startedAt,
        scheduledStartAt: room.scheduledStartAt,
        scheduledEndAt: room.scheduledEndAt,
        advancedOptions: room.advancedOptions,
      },
      now,
    );
  }

  return computeRoomExpiryFields(
    {
      status: room.status,
      scheduledStartAt: room.scheduledStartAt,
      scheduledEndAt: room.scheduledEndAt,
      advancedOptions: room.advancedOptions,
    },
    now,
  );
}

/** Direct → circle upgrade: never shorten `expires_at`; extend by at least 3h from upgrade time. */
export function computeExpiresAtAfterCircleUpgrade(params: CircleUpgradeExpiryParams): Date {
  const now = params.now ?? new Date();
  const candidateMs = [
    computeSessionCapDeadline(now, "circle").getTime(),
    computeLiveSessionExpiresAt({
      status: "live",
      roomType: "circle",
      startedAt: params.liveStartedAt,
      scheduledStartAt: params.scheduledStartAt,
      scheduledEndAt: params.scheduledEndAt,
      advancedOptions: params.advancedOptions,
    })?.getTime(),
    params.currentExpiresAt?.getTime(),
  ].filter((t): t is number => t != null);

  return new Date(Math.max(...candidateMs));
}

/** DB row must not back a live `room:{id}` Redis session (GET /room, circle join/token guard). */
export function isDbRoomSessionClosed(row: DbRoomSessionRow): boolean {
  return (
    row.status === "ended" ||
    row.status === "cancelled" ||
    row.isExpired ||
    computeIsExpired(row.expiresAt)
  );
}
