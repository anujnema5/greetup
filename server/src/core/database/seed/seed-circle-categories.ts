import "@/shared/config/load-env";

import { upsertCircleCategories } from "./upsert-circle-categories";

async function main() {
  console.log("🌱 Upserting circle_categories (idempotent)…");
  await upsertCircleCategories();
  console.log("✅ circle_categories upsert complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ circle_categories seed failed:", err);
    process.exit(1);
  });
