import { describe, expect, it } from "bun:test";
import { isOtcCallRoom } from "./otc-call-room";

describe("isOtcCallRoom", () => {
  it("detects open-to-connect match rooms", () => {
    const room = { sessionKind: "match" as const, openToConnectOrigin: true };
    expect(isOtcCallRoom(room)).toBe(true);
    expect(isOtcCallRoom({ sessionKind: "match" })).toBe(false);
    expect(isOtcCallRoom({ sessionKind: "connection_call" })).toBe(false);
    expect(isOtcCallRoom(null)).toBe(false);
  });
});
