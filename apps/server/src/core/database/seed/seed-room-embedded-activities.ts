import { upsertRoomEmbeddedActivities } from "./upsert-room-embedded-activities";

async function main() {
  console.log("🌱 Upserting room_embedded_activities (idempotent)…");
  await upsertRoomEmbeddedActivities();
  console.log("✅ room_embedded_activities upsert complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ room_embedded_activities seed failed:", err);
    process.exit(1);
  });
