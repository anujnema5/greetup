import * as t from "drizzle-orm/pg-core";
import { relations, sql } from 'drizzle-orm';
import { userProfiles } from "./users";

// Enums for single-select preferences (direct columns)
export const preferredGenderEnum = t.pgEnum("preferred_gender",
    ['any', 'male', 'female', 'others', 'same']
);

export const distancePreferenceEnum = t.pgEnum("distance_preference",
    ['nearby', 'same city', 'same country', 'random', 'global']
);

export const profilePreferences = t.pgTable("profile_preferences", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    profileId: t.uuid("profile_id")
        .references(() => userProfiles.id, { onDelete: 'cascade' })
        .notNull()
        .unique(),

    preferredGender: preferredGenderEnum("preferred_gender").default("any").notNull(),
    distancePreference: distancePreferenceEnum("distance_preference").default("random").notNull(),
    locationPreferenceEnabled: t.boolean("location_preference_enabled").default(false).notNull(),

    minAge: t.integer("min_age").default(18).notNull(),
    maxAge: t.integer("max_age").default(99).notNull(),

    createdAt: t.timestamp("created_at").defaultNow().notNull(),
    updatedAt: t.timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    t.index("idx_profile_preferences_profile").on(table.profileId),
    t.check("age_range_check", sql`${table.minAge} <= ${table.maxAge}`),
]);

export const profilePreferencesRelations = relations(profilePreferences, ({ one }) => ({
    profile: one(userProfiles, {
        fields: [profilePreferences.profileId],
        references: [userProfiles.id],
    }),
}));

export const userProfilesPreferencesRelations = relations(userProfiles, ({ one }) => ({
    preferences: one(profilePreferences, {
        fields: [userProfiles.id],
        references: [profilePreferences.profileId],
    }),
}));
