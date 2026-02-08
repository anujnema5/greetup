import * as t from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { yesNo } from "../utils";
import { userProfiles } from "./users";

export const isActiveEnum = t.pgEnum("is_active", yesNo);

export const professions = t.pgTable("professions", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    name: t.text("name").notNull(),
    category: t.text("category").notNull(),
    isActive: isActiveEnum("is_active").default("yes"),
    createdAt: t.timestamp("created_at").defaultNow().notNull()
});

export const profileProfessions = t.pgTable(
    "profile_professions",
    {
        id: t.uuid("id").defaultRandom().primaryKey(),
        professionId: t
            .uuid("profession_id")
            .references(() => professions.id, { onDelete: "cascade" })
            .notNull(),
        profileId: t
            .uuid("profile_id")
            .references(() => userProfiles.id, { onDelete: "cascade" })
            .notNull(),
        createdAt: t.timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        t.unique().on(table.professionId, table.profileId),
        t.index("profile_professions_profile_id_idx").on(table.profileId),
        t.index("profile_professions_profession_id_idx").on(table.professionId),
    ]
);

export const professionsRelations = relations(professions, ({ many }) => ({
    profiles: many(profileProfessions),
}));

export const userProfilesRelationsProfessions = relations(userProfiles, ({ many }) => ({
    professions: many(profileProfessions),
}));

export const profileProfessionsRelations = relations(profileProfessions, ({ one }) => ({
    profession: one(professions, {
        fields: [profileProfessions.professionId],
        references: [professions.id],
    }),
    profile: one(userProfiles, {
        fields: [profileProfessions.profileId],
        references: [userProfiles.id],
    }),
}));