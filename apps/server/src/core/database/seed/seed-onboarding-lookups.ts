import { createSeedDb } from "./seed-db";
import { upsertOnboardingLookups } from "./upsert-onboarding-lookups";

async function main() {
  const { db, pool } = createSeedDb();
  try {
    console.log("🌱 Upserting onboarding lookups (idempotent)...");
    await upsertOnboardingLookups(db);
    console.log("✅ Onboarding lookups upsert complete.");
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ onboarding lookups seed failed:", err);
    process.exit(1);
  });
