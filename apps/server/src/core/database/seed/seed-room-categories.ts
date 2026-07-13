import { upsertRoomCategories } from "./upsert-room-categories";

async function main() {
  console.log("🌱 Upserting room_categories (idempotent)…");
  await upsertRoomCategories();
  console.log("✅ room_categories upsert complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ room_categories seed failed:", err);
    process.exit(1);
  });
