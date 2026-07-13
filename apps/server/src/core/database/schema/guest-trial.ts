/**
 * Guest call trial — audit log for one-time try-before-signup video calls.
 * Profile flags live on `user_profiles` (see `users.ts`).
 */

import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

/** Append-only audit events for guest call trial lifecycle. */
export const guestTrialEvents = pgTable(
  "guest_trial_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guestUserId: text("guest_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    deviceHash: text("device_hash"),
    ipHash: text("ip_hash"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_guest_trial_events_guest_user_id").on(table.guestUserId),
    index("idx_guest_trial_events_event_type_created_at").on(table.eventType, table.createdAt),
  ],
);

export const guestTrialEventsRelations = relations(guestTrialEvents, ({ one }) => ({
  guestUser: one(users, {
    fields: [guestTrialEvents.guestUserId],
    references: [users.id],
  }),
}));

export const GUEST_TRIAL_EVENT_TYPES = [
  "guest_session_created",
  "guest_profile_saved",
  "guest_match_prep_saved",
  "guest_match_started",
  "guest_match_proposed",
  "guest_call_trial_consumed",
  "guest_signup_started",
  "guest_converted",
  "guest_blocked_abuse",
] as const;

export type GuestTrialEventType = (typeof GUEST_TRIAL_EVENT_TYPES)[number];

export type GuestTrialEvent = typeof guestTrialEvents.$inferSelect;
export type NewGuestTrialEvent = typeof guestTrialEvents.$inferInsert;
