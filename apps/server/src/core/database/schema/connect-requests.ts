import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users";
import { rooms } from "./rooms";

export const connectRequestStatusEnum = pgEnum("connect_request_status", [
  "pending",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
]);

export const connectRequests = pgTable(
  "connect_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: connectRequestStatusEnum("status").notNull().default("pending"),
    message: varchar("message", { length: 280 }),
    matchScoreSnapshot: integer("match_score_snapshot"),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    respondedAt: timestamp("responded_at"),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    check(
      "connect_requests_no_self",
      sql`${table.requesterUserId} <> ${table.targetUserId}`,
    ),
    index("idx_connect_requests_target_status").on(table.targetUserId, table.status),
    index("idx_connect_requests_requester_created").on(table.requesterUserId, table.createdAt),
    uniqueIndex("idx_connect_requests_pending_pair")
      .on(table.requesterUserId, table.targetUserId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const connectRequestsRelations = relations(connectRequests, ({ one }) => ({
  requester: one(users, {
    fields: [connectRequests.requesterUserId],
    references: [users.id],
    relationName: "connectRequestRequester",
  }),
  target: one(users, {
    fields: [connectRequests.targetUserId],
    references: [users.id],
    relationName: "connectRequestTarget",
  }),
  room: one(rooms, {
    fields: [connectRequests.roomId],
    references: [rooms.id],
  }),
}));
