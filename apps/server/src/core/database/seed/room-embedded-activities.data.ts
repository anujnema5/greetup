/**
 * Default rows for `room_embedded_activities`. Upserted on startup / `db:seed`.
 * Client static labels: `client/.../embedded-activities/known-activity-display.ts`.
 */
import type { InferInsertModel } from "drizzle-orm";

import { roomEmbeddedActivities } from "@/core/database/schema";

export type RoomEmbeddedActivitySeedRow = InferInsertModel<typeof roomEmbeddedActivities>;

export const ROOM_EMBEDDED_ACTIVITIES_SEED: RoomEmbeddedActivitySeedRow[] = [
  {
    slug: "chess",
    displayLabel: "Chess",
    emoji: "♟️",
    isActive: true,
    hidePeopleTab: true,
    blockParticipantInvites: true,
    suppressPeoplePanelCameras: true,
    inviteBlockedMessage:
      "You can't invite someone while a chess game is in progress. End the game first.",
    sortOrder: 0,
  },
  {
    slug: "watch",
    displayLabel: "Watch",
    emoji: "🎬",
    isActive: false,
    sortOrder: 10,
  },
  {
    slug: "draw",
    displayLabel: "Draw",
    emoji: "✏️",
    isActive: false,
    sortOrder: 20,
  },
  {
    slug: "quiz",
    displayLabel: "Quiz",
    emoji: "🧠",
    isActive: false,
    sortOrder: 30,
  },
  {
    slug: "music",
    displayLabel: "Music",
    emoji: "🎵",
    isActive: false,
    sortOrder: 40,
  },
  {
    slug: "dare",
    displayLabel: "Dare",
    emoji: "🎲",
    isActive: false,
    sortOrder: 50,
  },
];
