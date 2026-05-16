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
 * Stored as JSON; merge with {@link defaultRoomAdvancedOptions} when reading.
 */
export type RoomAdvancedOptions = {
  shouldHostStartMeeting?: boolean;
  shouldMeetingAutoStart?: boolean;
  circleExpirationMinutes?: number | null;
  deleteCircleAfterCall?: boolean;
  hostControlsActiveSpeaker?: boolean;
};

export function defaultRoomAdvancedOptions(): RoomAdvancedOptions {
  return {
    shouldHostStartMeeting: false,
    shouldMeetingAutoStart: true,
    circleExpirationMinutes: null,
    deleteCircleAfterCall: false,
    hostControlsActiveSpeaker: false,
  };
}

/**
 * `shouldMeetingAutoStart` and `shouldHostStartMeeting` are mutually exclusive.
 * After merging defaults with stored/partial JSON: auto-start on forces host-start off; then if the
 * host still opens the circle manually first, lazy auto-start is turned off. (Handles partial payloads like only
 * `{ shouldMeetingAutoStart: true }` where the default would otherwise leave both implied on.)
 */
export function applyMeetingStartExclusivity(opts: RoomAdvancedOptions): RoomAdvancedOptions {
  let hostOn = opts.shouldHostStartMeeting !== false;
  let autoOn = opts.shouldMeetingAutoStart === true;
  if (autoOn) {
    hostOn = false;
  }
  if (hostOn) {
    autoOn = false;
  }
  return {
    ...opts,
    shouldHostStartMeeting: hostOn,
    shouldMeetingAutoStart: autoOn,
  };
}

export function mergeRoomAdvancedOptions(
  stored: RoomAdvancedOptions | null | undefined,
): RoomAdvancedOptions {
  const merged = { ...defaultRoomAdvancedOptions(), ...stored };
  return applyMeetingStartExclusivity(merged);
}

/**
 * Room categories (e.g. match, startup founders, software engineers).
 */
export const roomCategories = pgTable(
  "room_categories",
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
  (table) => [index("room_categories_active_sort_idx").on(table.isActive, table.sortOrder)],
);

/** DB enum name kept as `circle_visibility` (see migrations). */
export const roomVisibilityEnum = pgEnum("circle_visibility", [
  "private",
  "public",
]);

export const roomStatusEnum = pgEnum("circle_status", [
  "scheduled",
  "live",
  "ended",
  "cancelled",
]);

export const roomParticipantRoleEnum = pgEnum("circle_participant_role", [
  "host",
  "participant",
]);

export const roomFriendInviteStatusEnum = pgEnum("circle_friend_invite_status", [
  "pending",
  "accepted",
  "declined",
  "cancelled",
]);

/** `direct` = 1:1-style; `circle` = group circle call. */
export const roomTypeEnum = pgEnum("room_type", ["direct", "circle"]);

/**
 * Live call session: circle or direct (1:1). Category applies to circle-style rooms.
 */
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    categoryId: uuid("category_id")
      .notNull()
      .references(() => roomCategories.id, { onDelete: "restrict" }),

    hostUserId: text("host_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),

    visibility: roomVisibilityEnum("visibility").notNull().default("private"),

    maxParticipants: integer("max_participants").notNull(),

    scheduledStartAt: timestamp("scheduled_start_at"),

    scheduledEndAt: timestamp("scheduled_end_at"),

    status: roomStatusEnum("status").notNull().default("scheduled"),

    startedAt: timestamp("started_at"),

    endedAt: timestamp("ended_at"),

    expiresAt: timestamp("expires_at"),

    isExpired: boolean("is_expired").notNull().default(false),

    rtcRoomId: text("rtc_room_id"),

    inviteCode: text("invite_code"),

    advancedOptions: jsonb("advanced_options")
      .$type<RoomAdvancedOptions>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    roomType: roomTypeEnum("room_type").notNull().default("circle"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "rooms_max_participants_bounds",
      sql`max_participants >= 2 AND max_participants <= 100`,
    ),
    uniqueIndex("rooms_invite_code_unique").on(table.inviteCode),
    index("rooms_category_id_idx").on(table.categoryId),
    index("rooms_host_user_id_idx").on(table.hostUserId),
    index("rooms_status_scheduled_start_idx").on(
      table.status,
      table.scheduledStartAt,
    ),
    index("rooms_visibility_status_idx").on(table.visibility, table.status),
  ],
);

export const roomParticipants = pgTable(
  "room_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),

    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: roomParticipantRoleEnum("role").notNull().default("participant"),

    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    leftAt: timestamp("left_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("room_participants_room_user_unique").on(table.roomId, table.userId),
    index("room_participants_user_id_idx").on(table.userId),
  ],
);

/** Host-banned users for a circle; cannot rejoin while the row exists. */
export const circleRestrictedUsers = pgTable(
  "circle_restricted_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    restrictedByUserId: text("restricted_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("circle_restricted_users_room_user_unique").on(table.roomId, table.userId),
    index("circle_restricted_users_room_id_idx").on(table.roomId),
  ],
);

export const roomFriendInvites = pgTable(
  "room_friend_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),

    inviterUserId: text("inviter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    inviteeUserId: text("invitee_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    status: roomFriendInviteStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "room_friend_invites_no_self",
      sql`inviter_user_id <> invitee_user_id`,
    ),
    uniqueIndex("room_friend_invites_room_invitee_unique").on(
      table.roomId,
      table.inviteeUserId,
    ),
    index("room_friend_invites_invitee_idx").on(table.inviteeUserId),
    index("room_friend_invites_room_idx").on(table.roomId),
  ],
);

export const roomCategoriesRelations = relations(roomCategories, ({ many }) => ({
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  category: one(roomCategories, {
    fields: [rooms.categoryId],
    references: [roomCategories.id],
  }),
  host: one(users, {
    fields: [rooms.hostUserId],
    references: [users.id],
    relationName: "roomHost",
  }),
  participants: many(roomParticipants),
  friendInvites: many(roomFriendInvites),
  restrictedUsers: many(circleRestrictedUsers),
}));

export const circleRestrictedUsersRelations = relations(circleRestrictedUsers, ({ one }) => ({
  room: one(rooms, {
    fields: [circleRestrictedUsers.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [circleRestrictedUsers.userId],
    references: [users.id],
    relationName: "circleRestrictedUser",
  }),
  restrictedBy: one(users, {
    fields: [circleRestrictedUsers.restrictedByUserId],
    references: [users.id],
    relationName: "circleRestrictedBy",
  }),
}));

export const roomParticipantsRelations = relations(roomParticipants, ({ one }) => ({
  room: one(rooms, {
    fields: [roomParticipants.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomParticipants.userId],
    references: [users.id],
    relationName: "roomParticipantUser",
  }),
}));

export const roomFriendInvitesRelations = relations(roomFriendInvites, ({ one }) => ({
  room: one(rooms, {
    fields: [roomFriendInvites.roomId],
    references: [rooms.id],
  }),
  inviter: one(users, {
    fields: [roomFriendInvites.inviterUserId],
    references: [users.id],
    relationName: "roomFriendInviteInviter",
  }),
  invitee: one(users, {
    fields: [roomFriendInvites.inviteeUserId],
    references: [users.id],
    relationName: "roomFriendInviteInvitee",
  }),
}));
