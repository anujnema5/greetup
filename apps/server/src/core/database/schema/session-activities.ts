import * as t from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { currentStatus } from "./current-status";
import { rooms } from "./rooms";

/** Max length for `detail` / `detail_normalized` on junction tables. */
export const ACTIVITY_DETAIL_STORAGE_MAX = 120;

/** How optional detail input behaves for a session activity catalog row. */
export const activityDetailModeEnum = t.pgEnum("activity_detail_mode", [
  "none",
  "language",
  "topic",
  "optional_topic",
]);

/**
 * Catalog of session activities (match prep + spaces) — not in-room embedded chess tiles.
 * Seeds: `seed/session-activities.data.ts`.
 */
export const activities = t.pgTable(
  "activities",
  {
    id: t.uuid("id").defaultRandom().primaryKey(),
    name: t.varchar("name", { length: 64 }).notNull().unique(),
    displayName: t.varchar("display_name", { length: 100 }).notNull(),
    description: t.text("description"),
    emoji: t.varchar("emoji", { length: 20 }),
    detailMode: activityDetailModeEnum("detail_mode").notNull().default("none"),
    detailLabel: t.varchar("detail_label", { length: 120 }),
    detailPlaceholder: t.varchar("detail_placeholder", { length: 120 }),
    detailMaxLength: t.integer("detail_max_length").notNull().default(80),
    sortOrder: t.integer("sort_order").notNull().default(0),
    isActive: t.boolean("is_active").notNull().default(true),
    /** May appear in match prep / 1:1 matching snapshot. */
    allowInMatchPrep: t.boolean("allow_in_match_prep").notNull().default(true),
    /** May be tagged on group spaces (`room_activities`). */
    allowInSpace: t.boolean("allow_in_space").notNull().default(true),
    /** When true, `detail` is required on save (e.g. language name, topic). */
    detailRequired: t.boolean("detail_required").notNull().default(false),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
    updatedAt: t
      .timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    t.index("idx_activities_active_sort").on(table.isActive, table.sortOrder),
    t.check(
      "chk_activities_detail_required_mode",
      sql`NOT ${table.detailRequired} OR ${table.detailMode} <> 'none'`,
    ),
  ],
);

export const currentStatusActivities = t.pgTable(
  "current_status_activities",
  {
    id: t.uuid("id").defaultRandom().primaryKey(),
    currentStatusId: t
      .uuid("current_status_id")
      .references(() => currentStatus.id, { onDelete: "cascade" })
      .notNull(),
    activityId: t
      .uuid("activity_id")
      .references(() => activities.id, { onDelete: "restrict" })
      .notNull(),
    detail: t.varchar("detail", { length: ACTIVITY_DETAIL_STORAGE_MAX }),
    detailNormalized: t.varchar("detail_normalized", { length: ACTIVITY_DETAIL_STORAGE_MAX }),
    sortOrder: t.smallint("sort_order").notNull().default(0),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    t.unique("unique_status_activity").on(table.currentStatusId, table.activityId),
    t.index("idx_status_activities_status").on(table.currentStatusId),
    t.index("idx_status_activities_activity").on(table.activityId),
    t.index("idx_status_activities_status_sort").on(table.currentStatusId, table.sortOrder),
  ],
);

export const roomActivities = t.pgTable(
  "room_activities",
  {
    id: t.uuid("id").defaultRandom().primaryKey(),
    roomId: t
      .uuid("room_id")
      .references(() => rooms.id, { onDelete: "cascade" })
      .notNull(),
    activityId: t
      .uuid("activity_id")
      .references(() => activities.id, { onDelete: "restrict" })
      .notNull(),
    detail: t.varchar("detail", { length: ACTIVITY_DETAIL_STORAGE_MAX }),
    detailNormalized: t.varchar("detail_normalized", { length: ACTIVITY_DETAIL_STORAGE_MAX }),
    sortOrder: t.smallint("sort_order").notNull().default(0),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    t.unique("unique_room_activity").on(table.roomId, table.activityId),
    t.index("idx_room_activities_room").on(table.roomId),
    t.index("idx_room_activities_activity").on(table.activityId),
    t.index("idx_room_activities_room_sort").on(table.roomId, table.sortOrder),
  ],
);

export const activitiesRelations = relations(activities, ({ many }) => ({
  currentStatusRows: many(currentStatusActivities),
  roomRows: many(roomActivities),
}));

export const currentStatusActivitiesRelations = relations(currentStatusActivities, ({ one }) => ({
  currentStatus: one(currentStatus, {
    fields: [currentStatusActivities.currentStatusId],
    references: [currentStatus.id],
  }),
  activity: one(activities, {
    fields: [currentStatusActivities.activityId],
    references: [activities.id],
  }),
}));

export const roomActivitiesRelations = relations(roomActivities, ({ one }) => ({
  room: one(rooms, {
    fields: [roomActivities.roomId],
    references: [rooms.id],
  }),
  activity: one(activities, {
    fields: [roomActivities.activityId],
    references: [activities.id],
  }),
}));
