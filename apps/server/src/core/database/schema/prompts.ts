import * as t from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { userProfiles } from "./users";

export const promptQuestions = t.pgTable("prompt_questions", {
  id: t.uuid("id").defaultRandom().primaryKey(),
  key: t.text("key").notNull().unique(),
  question: t.text("question").notNull(),
  isActive: t.boolean("is_active").notNull().default(true),
  order: t.integer("order").notNull().default(0),
  createdAt: t.timestamp("created_at").defaultNow().notNull(),
  updatedAt: t.timestamp("updated_at").defaultNow().notNull(),
});

export const userPromptAnswers = t.pgTable(
  "user_prompt_answers",
  {
    id: t.uuid("id").defaultRandom().primaryKey(),
    profileId: t.uuid("profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    questionId: t.uuid("question_id")
      .notNull()
      .references(() => promptQuestions.id),
    answer: t.text("answer").notNull(),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
    updatedAt: t.timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    t.unique("unique_profile_question").on(table.profileId, table.questionId),
    t.index("idx_prompt_answers_profile").on(table.profileId),
  ],
);

export const promptQuestionsRelations = relations(promptQuestions, ({ many }) => ({
  answers: many(userPromptAnswers),
}));

export const userPromptAnswersRelations = relations(userPromptAnswers, ({ one }) => ({
  question: one(promptQuestions, {
    fields: [userPromptAnswers.questionId],
    references: [promptQuestions.id],
  }),
  profile: one(userProfiles, {
    fields: [userPromptAnswers.profileId],
    references: [userProfiles.id],
  }),
}));

/** Extends userProfiles with prompt answers relation (follows goals/interests pattern). */
export const userProfilesPromptAnswersRelations = relations(userProfiles, ({ many }) => ({
  promptAnswers: many(userPromptAnswers),
}));
