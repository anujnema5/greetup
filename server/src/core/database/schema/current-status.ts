import * as t from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { userProfiles } from "./users";
import { currentStatusActivities } from "./session-activities";

export const availabilityEnum = t.pgEnum("availability",
    ['available', 'busy', 'offline']
);

/** Who to prioritize for 1:1 match prep (stored on current_status, not free text). */
export const connectionPreferenceEnum = t.pgEnum("connection_preference", [
    "same_profession",
    "different_profession",
    "open_to_anyone",
]);

export const matchIntentEnum = t.pgEnum("match_intent", ["quick", "activity"]);

export const moods = t.pgTable("moods", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    name: t.varchar("name", { length: 50 }).notNull().unique(),
    displayName: t.varchar("display_name", { length: 100 }).notNull(),
    description: t.text("description"),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
});

export const lookingForOptions = t.pgTable("looking_for_options", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    name: t.varchar("name", { length: 50 }).notNull().unique(),
    displayName: t.varchar("display_name", { length: 100 }).notNull(),
    description: t.text("description"),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
});

export const currentStatus = t.pgTable("current_status", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    profileId: t.uuid("profile_id")
        .references(() => userProfiles.id, { onDelete: 'cascade' })
        .notNull()
        .unique(),

    sessionGoal: t.text("session_goal"),
    connectionPreference: connectionPreferenceEnum("connection_preference"),
    matchIntent: matchIntentEnum("match_intent").default("quick").notNull(),
    availability: availabilityEnum("availability").default("offline").notNull(),

    lastActiveAt: t.timestamp("last_active_at").defaultNow().notNull(),
    updatedAt: t.timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    t.index("idx_current_status_profile").on(table.profileId),
    t.index("idx_current_status_availability").on(table.availability),
]);

export const currentStatusMoods = t.pgTable("current_status_moods", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    currentStatusId: t.uuid("current_status_id")
        .references(() => currentStatus.id, { onDelete: 'cascade' })
        .notNull(),
    moodId: t.uuid("mood_id")
        .references(() => moods.id, { onDelete: 'cascade' })
        .notNull(),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    t.unique("unique_status_mood").on(table.currentStatusId, table.moodId),
    t.index("idx_status_moods_status").on(table.currentStatusId),
    t.index("idx_status_moods_mood").on(table.moodId),
]);

export const currentStatusLookingFor = t.pgTable("current_status_looking_for", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    currentStatusId: t.uuid("current_status_id")
        .references(() => currentStatus.id, { onDelete: 'cascade' })
        .notNull(),
    lookingForId: t.uuid("looking_for_id")
        .references(() => lookingForOptions.id, { onDelete: 'cascade' })
        .notNull(),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    t.unique("unique_status_looking_for").on(table.currentStatusId, table.lookingForId),
    t.index("idx_status_looking_for_status").on(table.currentStatusId),
    t.index("idx_status_looking_for_option").on(table.lookingForId),
]);

export const currentStatusRelations = relations(currentStatus, ({ one, many }) => ({
    profile: one(userProfiles, {
        fields: [currentStatus.profileId],
        references: [userProfiles.id],
    }),
    moods: many(currentStatusMoods),
    lookingFor: many(currentStatusLookingFor),
    activities: many(currentStatusActivities),
}));

export const currentStatusMoodsRelations = relations(currentStatusMoods, ({ one }) => ({
    currentStatus: one(currentStatus, {
        fields: [currentStatusMoods.currentStatusId],
        references: [currentStatus.id],
    }),
    mood: one(moods, {
        fields: [currentStatusMoods.moodId],
        references: [moods.id],
    }),
}));

export const currentStatusLookingForRelations = relations(currentStatusLookingFor, ({ one }) => ({
    currentStatus: one(currentStatus, {
        fields: [currentStatusLookingFor.currentStatusId],
        references: [currentStatus.id],
    }),
    lookingForOption: one(lookingForOptions, {
        fields: [currentStatusLookingFor.lookingForId],
        references: [lookingForOptions.id],
    }),
}));

export const userProfilesStatusRelations = relations(userProfiles, ({ one }) => ({
    currentStatus: one(currentStatus, {
        fields: [userProfiles.id],
        references: [currentStatus.profileId],
    }),
}));