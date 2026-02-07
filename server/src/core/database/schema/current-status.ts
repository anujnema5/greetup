import * as t from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { userProfiles } from "./users";

// Enums for current status
export const moodEnum = t.pgEnum("mood",
    ['chill', 'energetic', 'curious', 'creative', 'need_advice']
);

export const availabilityEnum = t.pgEnum("availability",
    ['available', 'busy', 'offline'] // convert this to a table todo
);

export const lookingForEnum = t.pgEnum("looking_for",
    ['quick_chat', 'long_conversation', 'game_partner']
); // convert this to a table todo

// Current status table (frequently updated, separate from profile)
export const currentStatus = t.pgTable("current_status", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    profileId: t.uuid("profile_id")
        .references(() => userProfiles.id, { onDelete: 'cascade' })
        .notNull()
        .unique(), // One-to-one relationship

    // Current session state (changes frequently)
    mood: moodEnum("mood").notNull(),
    sessionGoal: t.text("session_goal"), // Free text: "want to discuss startup ideas"
    availability: availabilityEnum("availability").default("offline").notNull(),
    lookingFor: lookingForEnum("looking_for").notNull(),

    // Metadata
    lastActiveAt: t.timestamp("last_active_at").defaultNow().notNull(),
    updatedAt: t.timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    t.index("idx_current_status_profile").on(table.profileId),
    t.index("idx_current_status_availability").on(table.availability), // For finding available users
    t.index("idx_current_status_mood").on(table.mood), // For mood-based matching
    t.index("idx_current_status_looking_for").on(table.lookingFor), // For session type matching
]);

// Relations
export const currentStatusRelations = relations(currentStatus, ({ one }) => ({
    profile: one(userProfiles, {
        fields: [currentStatus.profileId],
        references: [userProfiles.id],
    }),
}));

export const userProfilesStatusRelations = relations(userProfiles, ({ one }) => ({
    currentStatus: one(currentStatus, {
        fields: [userProfiles.id],
        references: [currentStatus.profileId],
    }),
}));