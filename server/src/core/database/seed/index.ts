import { db } from "@/core/database";
import { upsertRoomCategories } from "./upsert-room-categories";
import { upsertOnboardingLookups } from "./upsert-onboarding-lookups";
import { upsertRoomEmbeddedActivities } from "./upsert-room-embedded-activities";
import { upsertSessionActivities } from "./upsert-session-activities";

async function seed() {
  console.log("🌱 Seeding database (idempotent upserts)...");

  await upsertOnboardingLookups(db);
  console.log("✅ Upserted onboarding lookups: goals, interests, professions, moods, lookingForOptions");

  await upsertRoomCategories();
  console.log("✅ Upserted room categories");

  await upsertRoomEmbeddedActivities();
  console.log("✅ Upserted room_embedded_activities");

  await upsertSessionActivities(db);
  console.log("✅ Upserted session activities");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
