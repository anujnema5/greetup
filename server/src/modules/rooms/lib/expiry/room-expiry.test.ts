import { describe, expect, it } from "bun:test";
import {
  CIRCLE_SESSION_MAX_MS,
  DIRECT_SESSION_MAX_MS,
} from "@/modules/rooms/constants/session/room-session-limits";
import {
  computeLiveSessionExpiresAt,
  computeSessionCapDeadline,
  isDbRoomSessionClosed,
  isLiveSessionCapExceeded,
} from "./room-expiry";

describe("computeSessionCapDeadline", () => {
  it("adds 2h for direct", () => {
    const start = new Date("2026-05-17T10:00:00.000Z");
    const cap = computeSessionCapDeadline(start, "direct");
    expect(cap.getTime() - start.getTime()).toBe(DIRECT_SESSION_MAX_MS);
  });

  it("adds 3h for circle", () => {
    const start = new Date("2026-05-17T10:00:00.000Z");
    const cap = computeSessionCapDeadline(start, "circle");
    expect(cap.getTime() - start.getTime()).toBe(CIRCLE_SESSION_MAX_MS);
  });
});

describe("computeLiveSessionExpiresAt", () => {
  it("uses min(session cap, calendar end) for scheduled circle", () => {
    const startedAt = new Date("2026-05-17T17:00:00.000Z");
    const scheduledStartAt = new Date("2026-05-17T17:00:00.000Z");
    const scheduledEndAt = new Date("2026-05-17T18:30:00.000Z");
    const expiresAt = computeLiveSessionExpiresAt({
      status: "live",
      roomType: "circle",
      startedAt,
      scheduledStartAt,
      scheduledEndAt,
      advancedOptions: null,
    });
    expect(expiresAt?.toISOString()).toBe(scheduledEndAt.toISOString());
  });

  it("uses session cap only for instant circle", () => {
    const startedAt = new Date("2026-05-17T10:00:00.000Z");
    const expiresAt = computeLiveSessionExpiresAt({
      status: "live",
      roomType: "circle",
      startedAt,
      scheduledStartAt: null,
      scheduledEndAt: null,
      advancedOptions: null,
    });
    expect(expiresAt?.getTime()).toBe(
      startedAt.getTime() + CIRCLE_SESSION_MAX_MS,
    );
  });
});

describe("isLiveSessionCapExceeded", () => {
  it("is false before cap and true after", () => {
    const startedAt = new Date("2026-05-17T10:00:00.000Z");
    expect(
      isLiveSessionCapExceeded(startedAt, "direct", new Date(startedAt.getTime() + 60_000)),
    ).toBe(false);
    expect(
      isLiveSessionCapExceeded(
        startedAt,
        "direct",
        new Date(startedAt.getTime() + DIRECT_SESSION_MAX_MS + 1),
      ),
    ).toBe(true);
  });
});

describe("isDbRoomSessionClosed", () => {
  it("treats ended status as closed", () => {
    expect(
      isDbRoomSessionClosed({
        status: "ended",
        isExpired: false,
        expiresAt: null,
      }),
    ).toBe(true);
  });

  it("treats past expires_at as closed", () => {
    expect(
      isDbRoomSessionClosed({
        status: "live",
        isExpired: false,
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      }),
    ).toBe(true);
  });
});
