import { describe, expect, it } from "bun:test";
import {
  canInviteWithoutExceedingCapacity,
  countReservedRoomSeats,
} from "./room-invite-capacity";

describe("room-invite-capacity", () => {
  it("dedupes active and pending when counting seats", () => {
    expect(
      countReservedRoomSeats(["host", "a"], ["a", "b"]),
    ).toBe(3);
  });

  it("allows invite when a seat remains", () => {
    expect(
      canInviteWithoutExceedingCapacity(["host"], [], 3, "new-user"),
    ).toBe(true);
  });

  it("blocks invite when circle is full", () => {
    expect(
      canInviteWithoutExceedingCapacity(["host", "a", "b"], [], 3, "new-user"),
    ).toBe(false);
  });

  it("counts pending invites toward capacity", () => {
    expect(
      canInviteWithoutExceedingCapacity(["host", "a"], ["b"], 3, "c"),
    ).toBe(false);
  });

  it("allows re-sending pending invite to same invitee without extra seat", () => {
    expect(
      canInviteWithoutExceedingCapacity(["host", "a"], ["b"], 3, "b"),
    ).toBe(true);
  });
});
