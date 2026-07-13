import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Request-based user connections (LinkedIn-style).
 * One row per directed request: requester → addressee.
 */

export const connectionStatusEnum = pgEnum("connection_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
]);

export const userConnections = pgTable(
  "user_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    addresseeId: text("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    status: connectionStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "user_connections_no_self",
      sql`requester_id <> addressee_id`,
    ),
    uniqueIndex("user_connections_requester_addressee_unique").on(
      table.requesterId,
      table.addresseeId,
    ),
    index("user_connections_requester_status_idx").on(
      table.requesterId,
      table.status,
    ),
    index("user_connections_addressee_status_idx").on(
      table.addresseeId,
      table.status,
    ),
  ],
);

export const userConnectionsRelations = relations(userConnections, ({ one }) => ({
  requester: one(users, {
    fields: [userConnections.requesterId],
    references: [users.id],
    relationName: "connectionRequester",
  }),
  addressee: one(users, {
    fields: [userConnections.addresseeId],
    references: [users.id],
    relationName: "connectionAddressee",
  }),
}));
