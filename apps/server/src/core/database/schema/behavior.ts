import * as t from "drizzle-orm/pg-core";
import { userProfiles } from "./users";
import { relations } from "drizzle-orm";

export const behavior = t.pgTable("behavior", {
    id: t.uuid("id").defaultRandom().primaryKey(), // Own unique ID
    userProfileId: t.uuid("user_profile_id")
        .references(() => userProfiles.id, { onDelete: "cascade" })
        .unique()
        .notNull(),
    reportCount: t.integer("report_count").default(0).notNull(),
    trustScore: t.integer("trust_score").default(100).notNull(),
    successfulConnections: t.integer("successful_connections").default(0).notNull(),
    averageSessionDuration: t.integer("average_session_duration").default(0).notNull(),
});

export const behaviorRelations = relations(behavior, ({ one }) => ({
    userProfile: one(userProfiles, {
        fields: [behavior.userProfileId],
        references: [userProfiles.id]
    })
}));

export const userProfileRelations = relations(userProfiles, ({ one }) => ({
    behavior: one(behavior, {
        fields: [userProfiles.id],
        references: [behavior.userProfileId],
    }),
}));