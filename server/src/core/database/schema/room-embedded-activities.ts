import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";

/**
 * Product config for in-call embedded activities (chess, watch, …).
 *
 * - **`is_active`**: show tile in the direct-call Activities tab.
 * - **Call UX columns**: mirror the client’s `resolveEmbeddedActivityCallPolicy` (invite blocking, etc.).
 *
 * Migrations: `migration/0020_room_embedded_activities.sql`. Seeds: `seed/room-embedded-activities.data.ts`.
 */
export const roomEmbeddedActivities = pgTable(
  "room_embedded_activities",
  {
    slug: text("slug").primaryKey(),
    displayLabel: text("display_label").notNull(),
    emoji: varchar("emoji", { length: 32 }).notNull(),
    isActive: boolean("is_active").notNull().default(false),
    hidePeopleTab: boolean("hide_people_tab").notNull().default(false),
    blockParticipantInvites: boolean("block_participant_invites").notNull().default(false),
    suppressPeoplePanelCameras: boolean("suppress_people_panel_cameras")
      .notNull()
      .default(false),
    inviteBlockedMessage: text("invite_blocked_message"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("room_embedded_activities_active_sort_idx").on(table.isActive, table.sortOrder),
  ],
);
