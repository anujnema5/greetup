import { mergeRoomAdvancedOptions, type RoomAdvancedOptions } from "@/core/database/schema";

/**
 * Circle **listing / join eligibility** time rules (Postgres `rooms.expires_at`, `is_expired`).
 *
 * - **Scheduled-only window:** `computeRoomExpiresAt` for `status === "scheduled"` may include
 *   `scheduled_start_at + circleExpirationMinutes` (see advanced options).
 * - **Live rows:** usually `scheduled_end_at` only (see `computeRoomExpiresAt`).
 * - **Wall-clock sync:** `roomsRepository.syncPastDueCircleRoomExpiry` (bulk) and
 *   `syncCircleRoomExpiryFromClockIfDue` (per-room on GET/join/token) set `is_expired` when
 *   `expires_at` is past or a scheduled circle missed join grace — keeps DB aligned without relying
 *   only on the active-circles list endpoint.
 *
 * **Session closed** for API guards: {@link isDbRoomSessionClosed} (ended / cancelled / expired).
 */

export type RoomExpiryInputs = {
  status: "scheduled" | "live" | "ended" | "cancelled";
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  advancedOptions: RoomAdvancedOptions | null | undefined;
};

function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
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
): { expiresAt: Date | null; isExpired: boolean } {
  const expiresAt = computeRoomExpiresAt(input);
  return { expiresAt, isExpired: computeIsExpired(expiresAt, now) };
}

/**
 * When a live circle has **zero** active participants and `deleteCircleAfterCall` is on, or when
 * computing a short grace window (legacy / tests). **Normal last-leaver leave** no longer updates
 * `expires_at` from this helper — see `leave-circle-rtc-session.service.ts`.
 */
export function computeEmptyLiveCircleGraceDeadline(input: {
  now: Date;
  graceMinutes: number;
  scheduledEndAt: Date | null;
  currentExpiresAt: Date | null;
}): { expiresAt: Date; endSessionImmediately: boolean } {
  const candidates: number[] = [input.now.getTime() + input.graceMinutes * 60_000];
  if (input.scheduledEndAt) {
    candidates.push(input.scheduledEndAt.getTime());
  }
  if (input.currentExpiresAt) {
    candidates.push(input.currentExpiresAt.getTime());
  }
  const t = Math.min(...candidates);
  const expiresAt = new Date(t);
  const endSessionImmediately = expiresAt.getTime() <= input.now.getTime();
  return { expiresAt, endSessionImmediately };
}

export type DbRoomSessionRow = {
  status: "scheduled" | "live" | "ended" | "cancelled";
  expiresAt: Date | null;
  isExpired: boolean;
};

/** DB row must not back a live `room:{id}` Redis session (GET /room, circle join/token guard). */
export function isDbRoomSessionClosed(row: DbRoomSessionRow): boolean {
  return (
    row.status === "ended" ||
    row.status === "cancelled" ||
    row.isExpired ||
    computeIsExpired(row.expiresAt)
  );
}
