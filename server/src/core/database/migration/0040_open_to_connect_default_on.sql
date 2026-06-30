ALTER TABLE "current_status" ALTER COLUMN "open_to_connect" SET DEFAULT true;--> statement-breakpoint
UPDATE "current_status" SET "open_to_connect" = true, "open_to_connect_updated_at" = COALESCE("open_to_connect_updated_at", now()) WHERE "open_to_connect" = false;--> statement-breakpoint
INSERT INTO "current_status" ("profile_id", "open_to_connect", "open_to_connect_updated_at", "availability", "last_active_at", "updated_at")
SELECT up."id", true, now(), 'offline', now(), now()
FROM "user_profiles" up
LEFT JOIN "current_status" cs ON cs."profile_id" = up."id"
WHERE cs."id" IS NULL;
