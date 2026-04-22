CREATE TABLE IF NOT EXISTS "prompt_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL UNIQUE,
  "question" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_prompt_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "answer" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_prompt_answers_profile_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade,
  CONSTRAINT "user_prompt_answers_question_id_fk"
    FOREIGN KEY ("question_id") REFERENCES "public"."prompt_questions"("id"),
  CONSTRAINT "unique_profile_question"
    UNIQUE ("profile_id", "question_id")
);

CREATE INDEX IF NOT EXISTS "idx_prompt_answers_profile" ON "user_prompt_answers" ("profile_id");
