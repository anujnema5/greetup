-- Ensures events table exists (0024 may have been applied as an older revision with only `users` columns).
DO $$ BEGIN
  CREATE TYPE "public"."nsfw_moderation_source" AS ENUM('live_circle_self', 'chat_media_upload');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."nsfw_moderation_action" AS ENUM('warned_and_kicked', 'account_banned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nsfw_moderation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"room_id" uuid,
	"source" "nsfw_moderation_source" NOT NULL,
	"strike_index" integer NOT NULL,
	"action_taken" "nsfw_moderation_action" NOT NULL,
	"client_scores" jsonb,
	"overturned" boolean DEFAULT false NOT NULL,
	"overturned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nsfw_moderation_events" ADD CONSTRAINT "nsfw_moderation_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nsfw_moderation_events" ADD CONSTRAINT "nsfw_moderation_events_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nsfw_moderation_events_user_id_idx" ON "nsfw_moderation_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nsfw_moderation_events_room_id_idx" ON "nsfw_moderation_events" USING btree ("room_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nsfw_moderation_events_created_at_idx" ON "nsfw_moderation_events" USING btree ("created_at");
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'nsfw_strike_count'
  ) AND to_regclass('public.nsfw_moderation_events') IS NOT NULL THEN
    INSERT INTO "nsfw_moderation_events" (
      "user_id",
      "room_id",
      "source",
      "strike_index",
      "action_taken",
      "created_at"
    )
    SELECT
      u."id",
      NULL,
      'live_circle_self',
      u."nsfw_strike_count",
      CASE WHEN u."nsfw_strike_count" >= 2 THEN 'account_banned'::"nsfw_moderation_action" ELSE 'warned_and_kicked'::"nsfw_moderation_action" END,
      COALESCE(u."last_nsfw_strike_at", now())
    FROM "users" u
    WHERE u."nsfw_strike_count" > 0;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "nsfw_strike_count";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_nsfw_strike_at";
