import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  integer,
  boolean,
  varchar,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Optional knobs for scheduling, lifecycle, and host control.
 * Stored as JSON; merge with {@link defaultCircleAdvancedOptions} when reading.
 */
export type CircleAdvancedOptions = {
  /** Room goes live only when the host starts (vs automatic start at scheduled time). */
  shouldHostStartMeeting?: boolean;
  /** Worker may mark live at `scheduled_start_at` without host action. */
  shouldMeetingAutoStart?: boolean;
  /** If set, no-show / lobby expiry in minutes (null = no such limit). */
  circleExpirationMinutes?: number | null;
  /** After call ends, delete or archive the circle (app-defined). */
  deleteCircleAfterCall?: boolean;
  /** Only the host can choose active speaker / spotlight. */
  hostControlsActiveSpeaker?: boolean;
};

export function defaultCircleAdvancedOptions(): CircleAdvancedOptions {
  return {
    shouldHostStartMeeting: true,
    shouldMeetingAutoStart: false,
    circleExpirationMinutes: null,
    deleteCircleAfterCall: false,
    hostControlsActiveSpeaker: false,
  };
}

export function mergeCircleAdvancedOptions(
  stored: CircleAdvancedOptions | null | undefined,
): CircleAdvancedOptions {
  return { ...defaultCircleAdvancedOptions(), ...stored };
}

/**
 * Category tags for circles (e.g. startup founders, software engineers, anime).
 * Separate table so categories can be curated, sorted, and reused.
 */
export const circleCategories = pgTable(
  "circle_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    displayName: text("display_name").notNull(),
    emoji: varchar("emoji", { length: 32 }),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("circle_categories_active_sort_idx").on(table.isActive, table.sortOrder)],
);

export const circleVisibilityEnum = pgEnum("circle_visibility", [
  "private",
  "public",
]);

export const circleStatusEnum = pgEnum("circle_status", [
  "scheduled",
  "live",
  "ended",
  "cancelled",
]);

export const circleParticipantRoleEnum = pgEnum("circle_participant_role", [
  "host",
  "participant",
]);

/** Invitations for connected users to join a circle (separate from invite_code links). */
export const circleFriendInviteStatusEnum = pgEnum(
  "circle_friend_invite_status",
  ["pending", "accepted", "declined", "cancelled"],
);

/**
 * Group video call ("circle") tied to one category.
 * - Public: discoverable; others may join without an invite (subject to maxParticipants).
 * - Private: not listed; host shares invite code or invites users.
 *
 * Instant vs scheduled: `scheduledStartAt` null ⇒ start immediately when created (typically status `live`).
 * Future `scheduledStartAt` ⇒ `scheduled` until the host or job promotes to `live`.
 */
export const circles = pgTable(
  "circles",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    categoryId: uuid("category_id")
      .notNull()
      .references(() => circleCategories.id, { onDelete: "restrict" }),

    hostUserId: text("host_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),

    visibility: circleVisibilityEnum("visibility").notNull().default("private"),

    /** Cap on simultaneous participants (enforced in app layer; includes host). */
    maxParticipants: integer("max_participants").notNull(),

    /**
     * When the session is meant to begin. Null = instant circle (starts when created).
     */
    scheduledStartAt: timestamp("scheduled_start_at"),

    scheduledEndAt: timestamp("scheduled_end_at"),

    status: circleStatusEnum("status").notNull().default("scheduled"),

    /** Set when the RTC session is actually created / call goes live. */
    startedAt: timestamp("started_at"),

    endedAt: timestamp("ended_at"),

    /** Optional binding to your rtc-service / SFU room. */
    rtcRoomId: text("rtc_room_id"),

    /**
     * For private circles: optional share token (unique when set).
     * Public circles may omit; discovery is by visibility + status instead.
     */
    inviteCode: text("invite_code"),

    advancedOptions: jsonb("advanced_options")
      .$type<CircleAdvancedOptions>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "circles_max_participants_bounds",
      sql`max_participants >= 2 AND max_participants <= 100`,
    ),
    uniqueIndex("circles_invite_code_unique").on(table.inviteCode),
    index("circles_category_id_idx").on(table.categoryId),
    index("circles_host_user_id_idx").on(table.hostUserId),
    index("circles_status_scheduled_start_idx").on(
      table.status,
      table.scheduledStartAt,
    ),
    index("circles_visibility_status_idx").on(table.visibility, table.status),
  ],
);

export const circleParticipants = pgTable(
  "circle_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),

    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: circleParticipantRoleEnum("role").notNull().default("participant"),

    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    leftAt: timestamp("left_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("circle_participants_circle_user_unique").on(
      table.circleId,
      table.userId,
    ),
    index("circle_participants_user_id_idx").on(table.userId),
  ],
);

export const circleFriendInvites = pgTable(
  "circle_friend_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),

    inviterUserId: text("inviter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    inviteeUserId: text("invitee_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    status: circleFriendInviteStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "circle_friend_invites_no_self",
      sql`inviter_user_id <> invitee_user_id`,
    ),
    uniqueIndex("circle_friend_invites_circle_invitee_unique").on(
      table.circleId,
      table.inviteeUserId,
    ),
    index("circle_friend_invites_invitee_idx").on(table.inviteeUserId),
    index("circle_friend_invites_circle_idx").on(table.circleId),
  ],
);

export const circleCategoriesRelations = relations(circleCategories, ({ many }) => ({
  circles: many(circles),
}));

export const circlesRelations = relations(circles, ({ one, many }) => ({
  category: one(circleCategories, {
    fields: [circles.categoryId],
    references: [circleCategories.id],
  }),
  host: one(users, {
    fields: [circles.hostUserId],
    references: [users.id],
    relationName: "circleHost",
  }),
  participants: many(circleParticipants),
  friendInvites: many(circleFriendInvites),
}));

export const circleParticipantsRelations = relations(circleParticipants, ({ one }) => ({
  circle: one(circles, {
    fields: [circleParticipants.circleId],
    references: [circles.id],
  }),
  user: one(users, {
    fields: [circleParticipants.userId],
    references: [users.id],
    relationName: "circleParticipantUser",
  }),
}));

export const circleFriendInvitesRelations = relations(circleFriendInvites, ({ one }) => ({
  circle: one(circles, {
    fields: [circleFriendInvites.circleId],
    references: [circles.id],
  }),
  inviter: one(users, {
    fields: [circleFriendInvites.inviterUserId],
    references: [users.id],
    relationName: "circleFriendInviteInviter",
  }),
  invitee: one(users, {
    fields: [circleFriendInvites.inviteeUserId],
    references: [users.id],
    relationName: "circleFriendInviteInvitee",
  }),
}));
