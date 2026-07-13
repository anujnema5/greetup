import { describe, expect, it } from "bun:test";
import {
  SPACE_SESSION_MAX_MS,
  DIRECT_SESSION_MAX_MS,
  SCHEDULED_EMPTY_ROOM_GRACE_MS,
} from "@/modules/rooms/constants/session/room-session-limits";
import { SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES } from "@/modules/rooms/constants/session/scheduled-space-join-grace";
import {
  evaluateRoomSessionEndReason,
  roomSessionClosedMessage,
  type RoomRowForReconcile,
} from "./reconcile-room-session-eval";

const baseRoom = (overrides: Partial<RoomRowForReconcile>): RoomRowForReconcile => ({
  id: "room-1",
  roomType: "space",
  status: "live",
  startedAt: new Date("2026-05-17T12:00:00.000Z"),
  scheduledStartAt: null,
  scheduledEndAt: null,
  expiresAt: new Date("2026-05-17T15:00:00.000Z"),
  isExpired: false,
  advancedOptions: {},
  ...overrides,
});

describe("evaluateRoomSessionEndReason", () => {
  it("returns join_grace_missed for scheduled circle past start + grace", () => {
    const start = new Date("2026-05-17T10:00:00.000Z");
    const now = new Date(
      start.getTime() + SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES * 60_000 + 1,
    );
    const reason = evaluateRoomSessionEndReason(
      baseRoom({
        status: "scheduled",
        scheduledStartAt: start,
        startedAt: null,
        expiresAt: null,
      }),
      { activeCount: 0, lastLeftAt: null },
      now,
    );
    expect(reason).toBe("join_grace_missed");
  });

  it("returns expires_at_past when live and expires_at passed", () => {
    const now = new Date("2026-05-17T16:00:00.000Z");
    expect(
      evaluateRoomSessionEndReason(
        baseRoom({ expiresAt: new Date("2026-05-17T15:00:00.000Z") }),
        { activeCount: 2, lastLeftAt: null },
        now,
      ),
    ).toBe("expires_at_past");
  });

  it("returns session_cap for direct after 2h live", () => {
    const startedAt = new Date("2026-05-17T10:00:00.000Z");
    const now = new Date(startedAt.getTime() + DIRECT_SESSION_MAX_MS + 1);
    expect(
      evaluateRoomSessionEndReason(
        baseRoom({ roomType: "direct", startedAt, expiresAt: null }),
        { activeCount: 1, lastLeftAt: null },
        now,
      ),
    ).toBe("session_cap");
  });

  it("returns session_cap for circle after 3h live", () => {
    const startedAt = new Date("2026-05-17T10:00:00.000Z");
    const now = new Date(startedAt.getTime() + SPACE_SESSION_MAX_MS + 1);
    expect(
      evaluateRoomSessionEndReason(
        baseRoom({ startedAt }),
        { activeCount: 1, lastLeftAt: null },
        now,
      ),
    ).toBe("session_cap");
  });

  it("returns calendar_end when scheduled circle is past calendar end", () => {
    const scheduledStartAt = new Date("2026-05-17T18:00:00.000Z");
    const scheduledEndAt = new Date("2026-05-17T20:00:00.000Z");
    const now = new Date("2026-05-17T20:01:00.000Z");
    expect(
      evaluateRoomSessionEndReason(
        baseRoom({
          scheduledStartAt,
          scheduledEndAt,
          startedAt: new Date("2026-05-17T18:05:00.000Z"),
          expiresAt: new Date("2026-05-17T21:00:00.000Z"),
        }),
        { activeCount: 1, lastLeftAt: null },
        now,
      ),
    ).toBe("calendar_end");
  });

  it("returns empty_room_2h when live with no active participants", () => {
    const lastLeftAt = new Date("2026-05-17T10:00:00.000Z");
    const now = new Date(lastLeftAt.getTime() + SCHEDULED_EMPTY_ROOM_GRACE_MS + 1);
    expect(
      evaluateRoomSessionEndReason(
        baseRoom({ startedAt: lastLeftAt }),
        { activeCount: 0, lastLeftAt },
        now,
      ),
    ).toBe("empty_room_2h");
  });

  it("returns empty_room_2h when lastLeftAt is an ISO string from SQL", () => {
    const lastLeftAt = "2026-05-17T10:00:00.000Z";
    const now = new Date(new Date(lastLeftAt).getTime() + SCHEDULED_EMPTY_ROOM_GRACE_MS + 1);
    expect(
      evaluateRoomSessionEndReason(
        baseRoom({ startedAt: new Date(lastLeftAt) }),
        { activeCount: 0, lastLeftAt: lastLeftAt as unknown as Date },
        now,
      ),
    ).toBe("empty_room_2h");
  });

  it("does not apply empty_room_2h before scheduled_start_at", () => {
    const scheduledStartAt = new Date("2026-05-17T20:00:00.000Z");
    const now = new Date("2026-05-17T18:00:00.000Z");
    expect(
      evaluateRoomSessionEndReason(
        baseRoom({
          scheduledStartAt,
          startedAt: new Date("2026-05-17T17:00:00.000Z"),
          expiresAt: null,
        }),
        { activeCount: 0, lastLeftAt: new Date("2026-05-17T16:00:00.000Z") },
        now,
      ),
    ).toBeNull();
  });

  it("returns null when live session is still valid", () => {
    const startedAt = new Date("2026-05-17T12:00:00.000Z");
    const now = new Date(startedAt.getTime() + 30 * 60_000);
    expect(
      evaluateRoomSessionEndReason(
        baseRoom({ startedAt }),
        { activeCount: 2, lastLeftAt: null },
        now,
      ),
    ).toBeNull();
  });
});

describe("roomSessionClosedMessage", () => {
  it("returns specific copy for empty_room_2h", () => {
    expect(roomSessionClosedMessage("empty_room_2h")).toContain("2 hours");
  });
});
