import * as t from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { yesNo } from "../utils";
import { userProfiles } from "./users";

export const isActiveEnum = t.pgEnum("is_active", yesNo)

export const professions = t.pgTable("professions", {
    id: t.uuid("id").defaultRandom().primaryKey(),
    name: t.text("name").notNull(),
    category: t.text("category").notNull(),
    isActive: isActiveEnum("is_active").default("yes"),
    createdAt: t.timestamp("created_at").defaultNow().notNull()
})