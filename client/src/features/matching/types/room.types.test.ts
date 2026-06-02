import { describe, expect, it } from "bun:test";
import { isCircleRoomData, isDirectMatchRoom, isRoomGroupLayout, parseRoomData } from "./room.types";

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

  it("parses circle", () => {
    const fromCircle = parseRoomData({
      sessionKind: "circle",
      roomId: "r3",
      hostUserId: "host",
      roomType: "circle",
      title: "My circle",
      lobbyGateActive: "1",
    });
    expect(fromCircle.sessionKind).toBe("circle");
    expect(isCircleRoomData(fromCircle)).toBe(true);
    expect(isRoomGroupLayout(fromCircle, null)).toBe(true);
  });
});
