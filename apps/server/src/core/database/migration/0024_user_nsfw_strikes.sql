CREATE TYPE "public"."nsfw_moderation_source" AS ENUM('live_circle_self', 'chat_media_upload');
--> statement-breakpoint
CREATE TYPE "public"."nsfw_moderation_action" AS ENUM('warned_and_kicked', 'account_banned');
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
ALTER TABLE "nsfw_moderation_events" ADD CONSTRAINT "nsfw_moderation_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nsfw_moderation_events" ADD CONSTRAINT "nsfw_moderation_events_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nsfw_moderation_events_user_id_idx" ON "nsfw_moderation_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nsfw_moderation_events_room_id_idx" ON "nsfw_moderation_events" USING btree ("room_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nsfw_moderation_events_created_at_idx" ON "nsfw_moderation_events" USING btree ("created_at");
