import { relations } from "drizzle-orm";
import * as t from "drizzle-orm/pg-core";

import { userProfiles } from "./users";

export const profileMatchPrepSessions = t.pgTable(
  "profile_match_prep_session", {
  id: t.uuid("id").defaultRandom().primaryKey(),
  profileId: t
    .uuid("profile_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  clientSessionId: t.varchar("client_session_id", { length: 128 }).notNull(),
  source: t.varchar("source", { length: 32 }).notNull(),
  acknowledgedAt: t.timestamp("acknowledged_at").defaultNow().notNull(),
},
  (table) => [
    t.unique("unique_profile_client_session").on(table.profileId, table.clientSessionId),
    t.index("idx_profile_match_prep_session_profile").on(table.profileId),
  ],
);

export const profileMatchPrepSessionsRelations = relations(profileMatchPrepSessions, ({ one }) => ({
  profile: one(userProfiles, {
    fields: [profileMatchPrepSessions.profileId],
    references: [userProfiles.id],
  }),
}));

export const userProfilesMatchPrepSessionsRelations = relations(userProfiles, ({ many }) => ({
  matchPrepSessions: many(profileMatchPrepSessions),
}));
