import { describe, expect, it } from "bun:test";
import { ApiError } from "@/lib/api/fetch-client";
import { shouldIgnoreClosedRoomJoin } from "./ignore-closed-room-join";

describe("shouldIgnoreClosedRoomJoin", () => {
  it("ignores join errors after the room was closed", () => {
    expect(
      shouldIgnoreClosedRoomJoin(
        new ApiError(400, JSON.stringify({ code: "ROOM_NOT_LIVE", message: "Room is not live yet" })),
      ),
    ).toBe(true);
    expect(
      shouldIgnoreClosedRoomJoin(
        new ApiError(410, JSON.stringify({ code: "ROOM_EXPIRED", message: "Room expired" })),
      ),
    ).toBe(true);
    expect(shouldIgnoreClosedRoomJoin(new Error("Room is not live yet"))).toBe(true);
  });

  it("still surfaces real join failures", () => {
    expect(
      shouldIgnoreClosedRoomJoin(
        new ApiError(403, JSON.stringify({ code: "NOT_ALLOWED", message: "Not allowed" })),
      ),
    ).toBe(false);
  });
});
