import { describe, expect, it } from "bun:test";
import {
  getSessionKind,
  isSpaceGroupSession,
  isSpaceSession,
  isConnectionCallSession,
  isMatchSession,
  isOpenToConnectMatchSession,
} from "./room-session-kind";

describe("room-session-kind", () => {
  it("classifies match", () => {
    const room = { sessionKind: "match" as const };
    expect(getSessionKind(room)).toBe("match");
    expect(isMatchSession(room)).toBe(true);
    expect(isConnectionCallSession(room)).toBe(false);
    expect(isSpaceSession(room)).toBe(false);
    expect(isSpaceGroupSession(room)).toBe(false);
  });

  it("classifies connection_call", () => {
    const room = { sessionKind: "connection_call" as const };
    expect(getSessionKind(room)).toBe("connection_call");
    expect(isConnectionCallSession(room)).toBe(true);
    expect(isMatchSession(room)).toBe(false);
    expect(isSpaceGroupSession(room)).toBe(false);
  });

  it("classifies space", () => {
    const room = { sessionKind: "space" as const };
    expect(getSessionKind(room)).toBe("space");
    expect(isSpaceSession(room)).toBe(true);
    expect(isSpaceGroupSession(room)).toBe(true);
    expect(isMatchSession(room)).toBe(false);
  });

  it("uses rtcRoomType space for group layout without sessionKind", () => {
    expect(isSpaceGroupSession({}, "space")).toBe(true);
    expect(isSpaceGroupSession({ sessionKind: "match" }, "space")).toBe(true);
  });

  it("classifies open-to-connect match", () => {
    const room = { sessionKind: "match" as const, openToConnectOrigin: true };
    expect(isOpenToConnectMatchSession(room)).toBe(true);
    expect(isMatchSession(room)).toBe(true);
    expect(isOpenToConnectMatchSession({ sessionKind: "match" })).toBe(false);
  });

  it("returns null for unknown or missing sessionKind", () => {
    expect(getSessionKind(null)).toBeNull();
    expect(getSessionKind({ sessionKind: "unknown" })).toBeNull();
    expect(getSessionKind({})).toBeNull();
  });
});
