import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users";

export const userBlocks = pgTable(
  "user_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockerId: text("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check("user_blocks_no_self", sql`blocker_id <> blocked_id`),
    uniqueIndex("user_blocks_blocker_blocked_unique").on(
      table.blockerId,
      table.blockedId,
    ),
    index("user_blocks_blocker_idx").on(table.blockerId),
    index("user_blocks_blocked_idx").on(table.blockedId),
  ],
);

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
  blocker: one(users, {
    fields: [userBlocks.blockerId],
    references: [users.id],
    relationName: "blockerUser",
  }),
  blocked: one(users, {
    fields: [userBlocks.blockedId],
    references: [users.id],
    relationName: "blockedUser",
  }),
}));
