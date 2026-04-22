CREATE TYPE "public"."room_invite_policy" AS ENUM('all_connections', 'selected_only');--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "room_invite_policy" "room_invite_policy" DEFAULT 'all_connections' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "room_invite_allowlisted_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
