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

export const connectionTypes = t.pgTable("connection_types", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    name: t.text("name").notNull().unique(),
    displayName: t.varchar("display_name", { length: 100 }).notNull(),
    description: t.text("description"),
    isActive: t.text("is_active").default("yes"),
    createdAt: t.timestamp("created_at").defaultNow().notNull()
});

export const profilePreferences = t.pgTable("profile_preferences", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    profileId: t.uuid("profile_id")
        .references(() => userProfiles.id, { onDelete: 'cascade' })
        .notNull()
        .unique(),

    preferredGender: preferredGenderEnum("preferred_gender").default("any").notNull(),
    distancePreference: distancePreferenceEnum("distance_preference").default("random").notNull(),

    minAge: t.integer("min_age").default(18).notNull(),
    maxAge: t.integer("max_age").default(99).notNull(),

    createdAt: t.timestamp("created_at").defaultNow().notNull(),
    updatedAt: t.timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    t.index("idx_profile_preferences_profile").on(table.profileId),
    t.check("age_range_check", sql`${table.minAge} <= ${table.maxAge}`),
]);

export const profileConnectionTypes = t.pgTable("profile_connection_types", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    profilePreferenceId: t.uuid("profile_preference_id")
        .references(() => profilePreferences.id, { onDelete: 'cascade' })
        .notNull(),
    connectionTypeId: t.uuid("connection_type_id")
        .references(() => connectionTypes.id, { onDelete: 'cascade' })
        .notNull(),
    priority: t.integer("priority"), // Optional: rank preference (1 = highest)
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    t.unique("unique_profile_connection_type").on(table.profilePreferenceId, table.connectionTypeId),
    t.index("idx_profile_connection_types_preference").on(table.profilePreferenceId),
    t.index("idx_profile_connection_types_connection").on(table.connectionTypeId),
]);

export const profilePreferencesRelations = relations(profilePreferences, ({ one, many }) => ({
    profile: one(userProfiles, {
        fields: [profilePreferences.profileId],
        references: [userProfiles.id],
    }),
    connectionTypes: many(profileConnectionTypes),
}));

export const connectionTypesRelations = relations(connectionTypes, ({ many }) => ({
    profiles: many(profileConnectionTypes),
}));

export const profileConnectionTypesRelations = relations(profileConnectionTypes, ({ one }) => ({
    profilePreference: one(profilePreferences, {
        fields: [profileConnectionTypes.profilePreferenceId],
        references: [profilePreferences.id],
    }),
    connectionType: one(connectionTypes, {
        fields: [profileConnectionTypes.connectionTypeId],
        references: [connectionTypes.id],
    }),
}));

export const userProfilesPreferencesRelations = relations(userProfiles, ({ one }) => ({
    preferences: one(profilePreferences, {
        fields: [userProfiles.id],
        references: [profilePreferences.profileId],
    }),
}));