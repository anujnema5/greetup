import * as t from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { yesNo } from "../utils";
import { userProfiles } from "./users";

export const isActiveEnum = t.pgEnum("is_active", yesNo);

export const goals = t.pgTable("goals", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    name: t.text("name").notNull().unique(),
    description: t.text("description"),
    isActive: isActiveEnum("is_active").default("yes"),
    createdAt: t.timestamp("created_at").defaultNow().notNull()
});

export const profileGoals = t.pgTable("profile_goals", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    goalId: t.uuid("goal_id").references(() => goals.id, { onDelete: 'cascade' }).notNull(),
    profileId: t.uuid("profile_id").references(() => userProfiles.id, { onDelete: 'cascade' }).notNull(),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    t.unique("unique_profile_goal").on(table.profileId, table.goalId),
    t.index("idx_profile_goals_profile").on(table.profileId),
    t.index("idx_profile_goals_goal").on(table.goalId),
]);

export const goalsRelations = relations(goals, ({ many }) => ({
    profiles: many(profileGoals),
}));

export const userProfilesGoalsRelations = relations(userProfiles, ({ many }) => ({
    goals: many(profileGoals),
}));

export const profileGoalsRelations = relations(profileGoals, ({ one }) => ({
    goal: one(goals, {
        fields: [profileGoals.goalId],
        references: [goals.id],
    }),
    profile: one(userProfiles, {
        fields: [profileGoals.profileId],
        references: [userProfiles.id],
    }),
}));