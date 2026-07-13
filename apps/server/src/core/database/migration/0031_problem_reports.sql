-- Problem / bug reports raised from the in-room modal and the in-app menu.

DO $$ BEGIN
  CREATE TYPE "public"."problem_report_source" AS ENUM('room_modal', 'app', 'guest_room_modal', 'guest_app');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."problem_report_status" AS ENUM('open', 'in_review', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "problem_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "room_id" uuid,
  "source" "problem_report_source" NOT NULL,
  "description" text NOT NULL,
  "screenshot_url" text,
  "status" "problem_report_status" DEFAULT 'open' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "problem_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "problem_reports_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "problem_reports_user_id_idx" ON "problem_reports" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "problem_reports_room_id_idx" ON "problem_reports" USING btree ("room_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "problem_reports_status_idx" ON "problem_reports" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "problem_reports_created_at_idx" ON "problem_reports" USING btree ("created_at");
