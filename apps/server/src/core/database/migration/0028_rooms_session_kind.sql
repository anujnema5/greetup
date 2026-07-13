CREATE TYPE "session_kind" AS ENUM('match', 'connection_call', 'circle');--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "session_kind" "session_kind";--> statement-breakpoint
CREATE INDEX "rooms_session_kind_idx" ON "rooms" USING btree ("session_kind");--> statement-breakpoint
UPDATE "rooms" SET "session_kind" = 'circle' WHERE "room_type" = 'circle' AND "session_kind" IS NULL;--> statement-breakpoint
UPDATE "rooms" SET "session_kind" = 'match' WHERE "room_type" = 'direct' AND "session_kind" IS NULL;--> statement-breakpoint
UPDATE "rooms" SET "session_kind" = 'connection_call' WHERE "room_type" = 'direct' AND "title" = 'Call' AND "session_kind" = 'match';
