ALTER TABLE "profile_preferences"
ADD COLUMN IF NOT EXISTS "location_preference_enabled" boolean DEFAULT false NOT NULL;
