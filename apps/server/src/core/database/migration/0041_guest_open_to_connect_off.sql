UPDATE "current_status" cs
SET "open_to_connect" = false, "open_to_connect_updated_at" = NULL
FROM "user_profiles" up
WHERE cs."profile_id" = up."id" AND up."is_guest" = true AND cs."open_to_connect" = true;
