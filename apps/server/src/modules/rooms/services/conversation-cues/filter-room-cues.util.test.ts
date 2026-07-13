import { describe, expect, it } from "bun:test";

import type { ConversationCueDto } from "@/modules/rooms/services/conversation-cues/conversation-cues.types";
import {
  canonicalParticipants,
  cueVisibleToUser,
  filterCuesForUser,
} from "@/modules/rooms/services/conversation-cues/filter-room-cues.util";

const userA = "user-aaa";
const userB = "user-bbb";

function cue(overrides: Partial<ConversationCueDto> & Pick<ConversationCueDto, "id">): ConversationCueDto {
  return {
    kind: "ai_generated",
    priority: 50,
    title: "Title",
    body: null,
    emoji: null,
    ...overrides,
  };
}

describe("canonicalParticipants", () => {
  it("orders ids lexicographically", () => {
    expect(canonicalParticipants(userB, userA)).toEqual({
      participantA: userA,
      participantB: userB,
    });
  });
});

describe("cueVisibleToUser", () => {
  const participants = canonicalParticipants(userA, userB);

  it("shows shared cues to both participants", () => {
    const shared = cue({ id: "shared_play_chess", kind: "shared_session_activity" });
    expect(cueVisibleToUser(shared, userA, participants)).toBe(true);
    expect(cueVisibleToUser(shared, userB, participants)).toBe(true);
  });

  it("shows peer-only cues only to the other participant", () => {
    const peerB = cue({
      id: "peer_session:b:vent",
      kind: "peer_session_activity",
    });
    expect(cueVisibleToUser(peerB, userA, participants)).toBe(true);
    expect(cueVisibleToUser(peerB, userB, participants)).toBe(false);
  });
});

describe("filterCuesForUser", () => {
  const participants = canonicalParticipants(userA, userB);

  it("drops shown cues and peer-only cues aimed at the wrong viewer", () => {
    const cues = [
      cue({ id: "shared_play_chess", kind: "shared_session_activity", priority: 90 }),
      cue({ id: "peer_session:b:vent", kind: "peer_session_activity", priority: 80 }),
      cue({ id: "peer_session:a:chess", kind: "peer_session_activity", priority: 70 }),
    ];

    expect(filterCuesForUser(cues, userA, participants, new Set())).toEqual([
      cues[0],
      cues[1],
    ]);
    expect(filterCuesForUser(cues, userB, participants, new Set(["shared_play_chess"]))).toEqual([
      cues[2],
    ]);
  });
});
