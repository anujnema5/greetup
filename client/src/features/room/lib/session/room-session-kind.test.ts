import { describe, expect, it } from "bun:test";
import {
  getSessionKind,
  isCircleGroupSession,
  isCircleSession,
  isConnectionCallSession,
  isMatchSession,
} from "./room-session-kind";

describe("room-session-kind", () => {
  it("classifies match", () => {
    const room = { sessionKind: "match" as const };
    expect(getSessionKind(room)).toBe("match");
    expect(isMatchSession(room)).toBe(true);
    expect(isConnectionCallSession(room)).toBe(false);
    expect(isCircleSession(room)).toBe(false);
    expect(isCircleGroupSession(room)).toBe(false);
  });

  it("classifies connection_call", () => {
    const room = { sessionKind: "connection_call" as const };
    expect(getSessionKind(room)).toBe("connection_call");
    expect(isConnectionCallSession(room)).toBe(true);
    expect(isMatchSession(room)).toBe(false);
    expect(isCircleGroupSession(room)).toBe(false);
  });

  it("classifies circle", () => {
    const room = { sessionKind: "circle" as const };
    expect(getSessionKind(room)).toBe("circle");
    expect(isCircleSession(room)).toBe(true);
    expect(isCircleGroupSession(room)).toBe(true);
    expect(isMatchSession(room)).toBe(false);
  });

  it("uses rtcRoomType circle for group layout without sessionKind", () => {
    expect(isCircleGroupSession({}, "circle")).toBe(true);
    expect(isCircleGroupSession({ sessionKind: "match" }, "circle")).toBe(true);
  });

  it("returns null for unknown or missing sessionKind", () => {
    expect(getSessionKind(null)).toBeNull();
    expect(getSessionKind({ sessionKind: "unknown" })).toBeNull();
    expect(getSessionKind({})).toBeNull();
  });
});
