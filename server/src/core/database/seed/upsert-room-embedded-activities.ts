import { sql } from "drizzle-orm";

import { db } from "@/core/database";
import { roomEmbeddedActivities } from "@/core/database/schema";

import { ROOM_EMBEDDED_ACTIVITIES_SEED } from "./room-embedded-activities.data";

/** Idempotent upsert by `slug`; safe for startup + manual `db:seed`. */
export async function upsertRoomEmbeddedActivities(): Promise<void> {
  await db
    .insert(roomEmbeddedActivities)
    .values([...ROOM_EMBEDDED_ACTIVITIES_SEED])
    .onConflictDoUpdate({
      target: roomEmbeddedActivities.slug,
      set: {
        displayLabel: sql`excluded.display_label`,
        emoji: sql`excluded.emoji`,
        isActive: sql`excluded.is_active`,
        hidePeopleTab: sql`excluded.hide_people_tab`,
        blockParticipantInvites: sql`excluded.block_participant_invites`,
        suppressPeoplePanelCameras: sql`excluded.suppress_people_panel_cameras`,
        inviteBlockedMessage: sql`excluded.invite_blocked_message`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    });
}
