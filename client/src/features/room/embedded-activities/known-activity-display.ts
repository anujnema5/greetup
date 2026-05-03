import type { RoomActivityId, RoomActivityMeta } from "@/features/room/types/room-activity.types";

/**
 * Static labels for every `RoomActivityId` (HUD / stage chrome when the tile is not in the active
 * catalog, e.g. synced chess after the module was turned off in DB). Keep aligned with seed:
 * `server/.../seed/room-embedded-activities.data.ts`.
 */
export const KNOWN_ACTIVITY_DISPLAY: Record<RoomActivityId, RoomActivityMeta> = {
  chess: { id: "chess", label: "Chess", emoji: "♟️" },
  watch: { id: "watch", label: "Watch", emoji: "🎬" },
  draw: { id: "draw", label: "Draw", emoji: "✏️" },
  quiz: { id: "quiz", label: "Quiz", emoji: "🧠" },
  music: { id: "music", label: "Music", emoji: "🎵" },
  dare: { id: "dare", label: "Dare", emoji: "🎲" },
};

/** Prefer the live catalog; fall back to {@link KNOWN_ACTIVITY_DISPLAY} for stage labeling only. */
export function resolveActivityMetaForStage(
  stageActivity: RoomActivityId | null,
  catalog: RoomActivityMeta[],
): RoomActivityMeta | null {
  if (!stageActivity) return null;
  return catalog.find((a) => a.id === stageActivity) ?? KNOWN_ACTIVITY_DISPLAY[stageActivity] ?? null;
}
