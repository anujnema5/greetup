import { describe, expect, it } from "bun:test";
import {
  sessionAllowsCallActivities,
  shouldShowDirectCallActivitiesTab,
} from "./direct-call-activities-ui";
import type { RoomActivityMeta } from "@/features/room/types/call/room-activity.types";

const chessTile: RoomActivityMeta = { id: "chess", label: "Chess", emoji: "♟️" };

describe("shouldShowDirectCallActivitiesTab", () => {
  it("shows the tab for direct calls with at least one active tile", () => {
    expect(shouldShowDirectCallActivitiesTab(false, [chessTile])).toBe(true);
  });

  it("hides the tab in group rooms even with active tiles", () => {
    expect(shouldShowDirectCallActivitiesTab(true, [chessTile])).toBe(false);
  });

  it("hides the tab while the catalog is empty or still loading", () => {
    expect(shouldShowDirectCallActivitiesTab(false, [])).toBe(false);
  });
});

describe("sessionAllowsCallActivities", () => {
  it("allows match sessions regardless of remote peer presence", () => {
    expect(
      sessionAllowsCallActivities({
        isMatchSession: true,
        isConnectionCallSession: false,
        hasConnectedRemotePeer: false,
      }),
    ).toBe(true);
  });

  it("allows connection calls once the callee has joined", () => {
    expect(
      sessionAllowsCallActivities({
        isMatchSession: false,
        isConnectionCallSession: true,
        hasConnectedRemotePeer: true,
      }),
    ).toBe(true);
  });

  it("blocks connection calls while ringing (caller alone in the room)", () => {
    expect(
      sessionAllowsCallActivities({
        isMatchSession: false,
        isConnectionCallSession: true,
        hasConnectedRemotePeer: false,
      }),
    ).toBe(false);
  });

  it("blocks space sessions", () => {
    expect(
      sessionAllowsCallActivities({
        isMatchSession: false,
        isConnectionCallSession: false,
        hasConnectedRemotePeer: true,
      }),
    ).toBe(false);
  });
});
