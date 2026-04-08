import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", [
  "connection_request_received",
  "connection_request_accepted",
  "circle_invite_received",
  "circle_started",
]);

export const notificationEntityTypeEnum = pgEnum("notification_entity_type", [
  "connection",
  "room",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: notificationTypeEnum("type").notNull(),
    entityType: notificationEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    dedupeKey: text("dedupe_key"),
    readAt: timestamp("read_at"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("notifications_recipient_created_at_idx").on(table.recipientUserId, table.createdAt),
    index("notifications_recipient_read_at_idx").on(table.recipientUserId, table.readAt),
    uniqueIndex("notifications_dedupe_key_unique").on(table.dedupeKey),
  ],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientUserId],
    references: [users.id],
    relationName: "notificationRecipient",
  }),
  actor: one(users, {
    fields: [notifications.actorUserId],
    references: [users.id],
    relationName: "notificationActor",
  }),
}));
