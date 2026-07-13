-- Rename legacy circle_* Postgres enum types to room_* (columns follow automatically).
ALTER TYPE "circle_visibility" RENAME TO "room_visibility";--> statement-breakpoint
ALTER TYPE "circle_status" RENAME TO "room_status";--> statement-breakpoint
ALTER TYPE "circle_participant_role" RENAME TO "room_participant_role";--> statement-breakpoint
ALTER TYPE "circle_friend_invite_status" RENAME TO "room_friend_invite_status";--> statement-breakpoint

-- Rename enum values: circle → space (room topology + session kind + notifications).
ALTER TYPE "room_type" RENAME VALUE 'circle' TO 'space';--> statement-breakpoint
ALTER TYPE "session_kind" RENAME VALUE 'circle' TO 'space';--> statement-breakpoint
ALTER TYPE "notification_type" RENAME VALUE 'circle_invite_received' TO 'space_invite_received';--> statement-breakpoint
ALTER TYPE "notification_type" RENAME VALUE 'circle_started' TO 'space_started';--> statement-breakpoint

ALTER TABLE "rooms" ALTER COLUMN "room_type" SET DEFAULT 'space'::room_type;
