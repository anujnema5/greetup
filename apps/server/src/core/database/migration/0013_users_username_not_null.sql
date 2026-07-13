-- Ensure every user has a unique username (required for public profile URLs).
-- Backfill existing NULL/blank rows; new rows without a username get a deterministic placeholder until onboarding updates it.

CREATE OR REPLACE FUNCTION users_username_placeholder()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.username IS NULL OR btrim(NEW.username) = '' THEN
    NEW.username := 'g' || substr(md5(NEW.id::text), 1, 29);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_username_placeholder_trigger ON "users";
CREATE TRIGGER users_username_placeholder_trigger
BEFORE INSERT ON "users"
FOR EACH ROW
EXECUTE FUNCTION users_username_placeholder();

UPDATE "users"
SET "username" = 'g' || substr(md5("id"::text), 1, 29)
WHERE "username" IS NULL OR btrim("username") = '';

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
