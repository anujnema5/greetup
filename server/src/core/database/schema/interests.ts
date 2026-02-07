import * as t from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { yesNo } from "../utils";
import { userProfiles } from "./users";

export const isActiveEnum = t.pgEnum("is_active", yesNo)

export const interests = t.pgTable("interests", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    name: t.text("name").notNull(),
    category: t.text("category").notNull(),
    isActive: isActiveEnum("is_active").default("yes"),
    createdAt: t.timestamp("created_at").defaultNow().notNull()
})

export const profileInterests = t.pgTable("profile_interests", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    interestId: t.uuid("interest_id").references(() => interests.id).notNull(),
    profileId: t.uuid("profile_id").references(() => userProfiles.id).notNull(),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    t.unique().on(table.interestId, table.profileId),
    t.index("profile_interests_profile_id_idx").on(table.profileId),
    t.index("profile_interests_interest_id_idx").on(table.interestId),
])

export const interestsRelations = relations(interests, ({ many }) => ({
    profileInterests: many(profileInterests),
}));

export const profileInterestsRelations = relations(profileInterests, ({ one }) => ({
    interest: one(interests, {
        fields: [profileInterests.interestId],
        references: [interests.id],
    }),
    profile: one(userProfiles, {
        fields: [profileInterests.profileId],
        references: [userProfiles.id],
    }),
}));

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
    profileInterests: many(profileInterests),
}));