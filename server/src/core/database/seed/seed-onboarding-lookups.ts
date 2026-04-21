import { upsertOnboardingLookups } from "./upsert-onboarding-lookups";

async function main() {
  console.log("🌱 Upserting onboarding lookups (idempotent)...");
  await upsertOnboardingLookups();
  console.log("✅ Onboarding lookups upsert complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ onboarding lookups seed failed:", err);
    process.exit(1);
  });
