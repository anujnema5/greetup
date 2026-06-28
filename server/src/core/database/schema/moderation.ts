import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { rooms } from "./rooms";

/** Where the NSFW signal originated (extend as product grows). */
export const nsfwModerationSourceEnum = pgEnum("nsfw_moderation_source", [
  "live_space_self",
  "chat_media_upload",
]);

/** Enforcement applied when the event was recorded. */
export const nsfwModerationActionEnum = pgEnum("nsfw_moderation_action", [
  "warned_and_kicked",
  "account_banned",
]);

/**
 * Append-only NSFW policy events per user.
 * Strike count for ban policy is derived from non-overturned rows (see repository window).
 */
export const nsfwModerationEvents = pgTable(
  "nsfw_moderation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Space room when the violation occurred (null for non-room sources). */
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
    source: nsfwModerationSourceEnum("source").notNull(),
    /** 1-based strike index at the time of this event (within policy window). */
    strikeIndex: integer("strike_index").notNull(),
    actionTaken: nsfwModerationActionEnum("action_taken").notNull(),
    /** Optional nsfwjs scores from client (no image bytes). */
    clientScores: jsonb("client_scores"),
    overturned: boolean("overturned").default(false).notNull(),
    overturnedAt: timestamp("overturned_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("nsfw_moderation_events_user_id_idx").on(table.userId),
    index("nsfw_moderation_events_room_id_idx").on(table.roomId),
    index("nsfw_moderation_events_created_at_idx").on(table.createdAt),
  ],
);

export const nsfwModerationEventsRelations = relations(nsfwModerationEvents, ({ one }) => ({
  user: one(users, {
    fields: [nsfwModerationEvents.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [nsfwModerationEvents.roomId],
    references: [rooms.id],
  }),
}));
