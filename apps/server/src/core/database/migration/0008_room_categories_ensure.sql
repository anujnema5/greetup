-- Idempotent: rename circle_categories → room_categories if 0007 was never applied.
-- No-op when room_categories already exists.

DO $ensure_room_categories$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'room_categories'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'circle_categories'
  ) THEN
    RAISE EXCEPTION 'Expected circle_categories or room_categories — run migrations 0002–0006 first';
  END IF;

  ALTER TABLE "circle_categories" RENAME TO "room_categories";
END
$ensure_room_categories$;

--> statement-breakpoint

-- Missing index/relation uses SQLSTATE 42P01 (not 42704) in PostgreSQL — catch both.
DO $rename_idx$
BEGIN
  BEGIN
    ALTER INDEX "circle_categories_active_sort_idx" RENAME TO "room_categories_active_sort_idx";
  EXCEPTION
    WHEN SQLSTATE '42P01' THEN NULL;
    WHEN SQLSTATE '42704' THEN NULL;
    WHEN SQLSTATE '42710' THEN NULL;
  END;
END
$rename_idx$;

--> statement-breakpoint

DO $rename_slug_uq$
BEGIN
  BEGIN
    ALTER TABLE "room_categories" RENAME CONSTRAINT "circle_categories_slug_unique" TO "room_categories_slug_unique";
  EXCEPTION
    WHEN SQLSTATE '42P01' THEN NULL;
    WHEN SQLSTATE '42704' THEN NULL;
    WHEN SQLSTATE '42710' THEN NULL;
  END;
END
$rename_slug_uq$;

--> statement-breakpoint

DO $rename_rooms_fk$
BEGIN
  BEGIN
    ALTER TABLE "rooms" RENAME CONSTRAINT "rooms_category_id_circle_categories_id_fk" TO "rooms_category_id_room_categories_id_fk";
  EXCEPTION
    WHEN SQLSTATE '42P01' THEN NULL;
    WHEN SQLSTATE '42704' THEN NULL;
    WHEN SQLSTATE '42710' THEN NULL;
  END;
END
$rename_rooms_fk$;
