-- Rename remaining circle_* enum values (conversation + NSFW source).
ALTER TYPE "conversation_type" RENAME VALUE 'room_circle' TO 'room_space';--> statement-breakpoint
ALTER TYPE "nsfw_moderation_source" RENAME VALUE 'live_circle_self' TO 'live_space_self';
