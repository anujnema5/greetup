-- Dev databases that applied 0022 before the room_* rename.
DO $$
BEGIN
  IF to_regclass('public.circle_restricted_users') IS NOT NULL
     AND to_regclass('public.room_restricted_users') IS NULL THEN
    ALTER TABLE "circle_restricted_users" RENAME TO "room_restricted_users";
  END IF;
END $$;
--> statement-breakpoint
ALTER INDEX IF EXISTS "circle_restricted_users_room_user_unique" RENAME TO "room_restricted_users_room_user_unique";
--> statement-breakpoint
ALTER INDEX IF EXISTS "circle_restricted_users_room_id_idx" RENAME TO "room_restricted_users_room_id_idx";
