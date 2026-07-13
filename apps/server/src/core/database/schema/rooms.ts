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
  spaceExpirationMinutes?: number | null;
  deleteSpaceAfterCall?: boolean;
  hostControlsActiveSpeaker?: boolean;
};

export function defaultRoomAdvancedOptions(): RoomAdvancedOptions {
  return {
    shouldHostStartMeeting: false,
    shouldMeetingAutoStart: true,
    spaceExpirationMinutes: null,
    deleteSpaceAfterCall: false,
    hostControlsActiveSpeaker: false,
  };
}

/**
 * `shouldMeetingAutoStart` and `shouldHostStartMeeting` are mutually exclusive.
 * After merging defaults with stored/partial JSON: auto-start on forces host-start off; then if the
 * host still opens the space manually first, lazy auto-start is turned off. (Handles partial payloads like only
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
  const normalized: RoomAdvancedOptions = {
    ...merged,
    spaceExpirationMinutes: merged.spaceExpirationMinutes ?? null,
    deleteSpaceAfterCall: merged.deleteSpaceAfterCall ?? false,
  };
  return applyMeetingStartExclusivity(normalized);
}

export function resolveSpaceExpirationMinutes(
  opts: RoomAdvancedOptions,
): number | null | undefined {
  return opts.spaceExpirationMinutes;
}

export function resolveDeleteSpaceAfterCall(opts: RoomAdvancedOptions): boolean {
  return opts.deleteSpaceAfterCall ?? false;
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

/** Postgres enum `room_visibility` (renamed from `circle_visibility` in migration 0032). */
export const roomVisibilityEnum = pgEnum("room_visibility", [
  "private",
  "public",
]);

export const roomStatusEnum = pgEnum("room_status", [
  "scheduled",
  "live",
  "ended",
  "cancelled",
]);

export const roomParticipantRoleEnum = pgEnum("room_participant_role", [
  "host",
  "participant",
]);

export const roomFriendInviteStatusEnum = pgEnum("room_friend_invite_status", [
  "pending",
  "accepted",
  "declined",
  "cancelled",
]);

/** `direct` = 1:1-style; `space` = group space call. */
export const roomTypeEnum = pgEnum("room_type", ["direct", "space"]);

/** Why this room exists — distinct from `room_type` (topology). */
export const sessionKindEnum = pgEnum("session_kind", [
  "match",
  "connection_call",
  "space",
]);

/**
 * Live call session: space or direct (1:1). Category applies to space-style rooms.
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

    roomType: roomTypeEnum("room_type").notNull().default("space"),

    sessionKind: sessionKindEnum("session_kind").notNull(),

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
    index("rooms_session_kind_idx").on(table.sessionKind),
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

/** Host-banned users for a room; cannot rejoin while the row exists. */
export const roomRestrictedUsers = pgTable(
  "room_restricted_users",
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
    uniqueIndex("room_restricted_users_room_user_unique").on(table.roomId, table.userId),
    index("room_restricted_users_room_id_idx").on(table.roomId),
  ],
);

export type RoomRestrictedUser = typeof roomRestrictedUsers.$inferSelect;

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
  restrictedUsers: many(roomRestrictedUsers),
}));

export const roomRestrictedUsersRelations = relations(roomRestrictedUsers, ({ one }) => ({
  room: one(rooms, {
    fields: [roomRestrictedUsers.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomRestrictedUsers.userId],
    references: [users.id],
    relationName: "roomRestrictedUser",
  }),
  restrictedBy: one(users, {
    fields: [roomRestrictedUsers.restrictedByUserId],
    references: [users.id],
    relationName: "roomRestrictedBy",
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
