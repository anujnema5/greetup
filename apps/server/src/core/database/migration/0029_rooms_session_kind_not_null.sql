UPDATE "rooms" SET "session_kind" = 'circle' WHERE "session_kind" IS NULL AND "room_type" = 'circle';--> statement-breakpoint
UPDATE "rooms" SET "session_kind" = 'match' WHERE "session_kind" IS NULL AND "room_type" = 'direct';--> statement-breakpoint
UPDATE "rooms" SET "session_kind" = 'match' WHERE "session_kind" IS NULL;--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "session_kind" SET NOT NULL;
