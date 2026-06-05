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
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const userBannedEnum = pgEnum('user_banned', [
  'yes',
  'no',
  'temporarily',
]);

/** Who may invite this user when adding friends to a room (`room_friend_invites`). */
export const roomInvitePolicyEnum = pgEnum("room_invite_policy", [
  "all_connections",
  "selected_only",
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
  /** Lowercase unique handle for URLs and search (e.g. /u/janedoe). Required in DB; inserts omitting it get a placeholder via trigger until onboarding. */
  username: text("username").notNull().unique(),
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
  isOnboarded: boolean("is_onboarded").default(false).notNull(),
  /** Set when the user completes or skips the first-run Home product tour. */
  welcomeTourSeenAt: timestamp("welcome_tour_seen_at"),

  isPremium: boolean("is_premium").default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),

  roomInvitePolicy: roomInvitePolicyEnum("room_invite_policy")
    .default("all_connections")
    .notNull(),
  roomInviteAllowlistedUserIds: jsonb("room_invite_allowlisted_user_ids")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

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

export const userSocials = pgTable("user_socials", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .unique()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  instagram: text("instagram"),
  twitter: text("twitter"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  socials: one(userSocials, {
    fields: [userProfiles.id],
    references: [userSocials.profileId],
  }),
  photos: many(userPhotos),
}));

export const userSocialsRelations = relations(userSocials, ({ one }) => ({
  profile: one(userProfiles, {
    fields: [userSocials.profileId],
    references: [userProfiles.id],
  }),
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