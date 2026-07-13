/**
 * User-submitted problem / bug reports.
 * Same report shape from two surfaces: the in-room modal and the in-app menu.
 * `source` distinguishes them (and guest vs. regular). `roomId` is set only for room reports.
 */

import { relations } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { rooms } from "./rooms";
import { users } from "./users";

/** Where the report was raised from. `guest_*` variants come from try-before-signup accounts. */
export const problemReportSourceEnum = pgEnum("problem_report_source", [
  "room_modal",
  "app",
  "guest_room_modal",
  "guest_app",
]);

/** Triage lifecycle. Starts at `open`. */
export const problemReportStatusEnum = pgEnum("problem_report_status", [
  "open",
  "in_review",
  "resolved",
  "dismissed",
]);

/** Auto-captured client context (no PII beyond what the user typed). */
export type ProblemReportMetadata = {
  /** App route / pathname the user was on when reporting. */
  route?: string;
  userAgent?: string;
  /** App build/version string if the client knows it. */
  appVersion?: string;
  platform?: string;
};

export const problemReports = pgTable(
  "problem_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Set only for reports raised inside a room; null for app-wide reports. */
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
    source: problemReportSourceEnum("source").notNull(),
    description: text("description").notNull(),
    /** Optional public URL of a screenshot uploaded to Spaces. */
    screenshotUrl: text("screenshot_url"),
    status: problemReportStatusEnum("status").default("open").notNull(),
    metadata: jsonb("metadata").$type<ProblemReportMetadata>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("problem_reports_user_id_idx").on(table.userId),
    index("problem_reports_room_id_idx").on(table.roomId),
    index("problem_reports_status_idx").on(table.status),
    index("problem_reports_created_at_idx").on(table.createdAt),
  ],
);

export const problemReportsRelations = relations(problemReports, ({ one }) => ({
  user: one(users, {
    fields: [problemReports.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [problemReports.roomId],
    references: [rooms.id],
  }),
}));

export type ProblemReport = typeof problemReports.$inferSelect;
export type NewProblemReport = typeof problemReports.$inferInsert;
