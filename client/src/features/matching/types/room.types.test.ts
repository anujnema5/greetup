import { describe, expect, it } from "bun:test";
import { isSpaceRoomData, isDirectMatchRoom, isRoomGroupLayout, parseRoomData } from "./room.types";

describe("parseRoomData", () => {
  it("parses match with sessionKind", () => {
    const room = parseRoomData({
      sessionKind: "match",
      roomId: "r1",
      userA: "a",
      userB: "b",
      matchScore: "88",
    });
    expect(room.sessionKind).toBe("match");
    expect(isDirectMatchRoom(room)).toBe(true);
    expect(isRoomGroupLayout(room, "direct")).toBe(false);
  });

  it("parses connection_call", () => {
    const room = parseRoomData({
      sessionKind: "connection_call",
      roomId: "r2",
      hostUserId: "host",
      roomType: "direct",
      title: "Call",
      conversationId: "conv-1",
    });
    expect(room.sessionKind).toBe("connection_call");
    expect(isDirectMatchRoom(room)).toBe(false);
    expect(isRoomGroupLayout(room, "direct")).toBe(false);
  });

  it("parses space", () => {
    const fromSpace = parseRoomData({
      sessionKind: "space",
      roomId: "r3",
      hostUserId: "host",
      roomType: "space",
      title: "My space",
      lobbyGateActive: "1",
    });
    expect(fromSpace.sessionKind).toBe("space");
    expect(isSpaceRoomData(fromSpace)).toBe(true);
    expect(isRoomGroupLayout(fromSpace, null)).toBe(true);
  });
});
