/**
 * USER & PROFILE SCHEMA
 * 
 * Core entities:
 * - users: Authentication and account data
 * - user_profiles: Public profile and matching data (1:1 with user)
 * - user_photos: Profile photos (many per profile)
 * - user_locations: User location data
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  geometry,
  pgEnum,
  uuid
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userBannedEnum = pgEnum('user_banned', [
  'yes',
  'no',
  'temporarily',
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified").default(false),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  isBanned: userBannedEnum("is_banned")
    .default("no")
    .notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  purpose: text("purpose"),
  bio: text("bio"),
  gender: text("gender"),
  age: integer("age"),

  profession: text("profession"),
  educationLevel: text("education_level"),
  personalityTags: text("personality_tags"),

  profileCompletion: integer("profile_completion").default(0),
  trustScore: integer("trust_score").default(0),

  isPremium: boolean("is_premium").default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const userLocations = pgTable("user_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .unique()
    .references(() => userProfiles.id, { onDelete: "cascade" }),

  country: text("country"),
  countryCode: text("country_code"),

  region: text("region"),
  regionCode: text("region_code"),
  city: text("city"),

  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  location: geometry("location", { type: "point", mode: "xy", srid: 4326 }),

  timezone: text("timezone"),
  source: text("source"),
  isPublic: boolean("is_public").default(false),
  radiusPreference: integer("radius_preference"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPhotos = pgTable("user_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(),
  order: integer("order").default(0),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User relations
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
}));

// User Profile relations (extended with goals, interests, etc. in schema/relations.ts)
export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
  location: one(userLocations, {
    fields: [userProfiles.id],
    references: [userLocations.profileId],
  }),
  photos: many(userPhotos),
}));

// User Location relations
export const userLocationsRelations = relations(userLocations, ({ one }) => ({
  profile: one(userProfiles, {
    fields: [userLocations.profileId],
    references: [userProfiles.id],
  }),
}));

// User Photos relations
export const userPhotosRelations = relations(userPhotos, ({ one }) => ({
  profile: one(userProfiles, {
    fields: [userPhotos.profileId],
    references: [userProfiles.id],
  }),
}));