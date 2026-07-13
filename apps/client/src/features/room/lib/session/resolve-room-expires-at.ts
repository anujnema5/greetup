import type { RoomData } from "@/features/matching/types/room.types";

function parseExpiresAt(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : raw;
}

/** ISO `expires_at` from GET `/room/:id` when the server exposes session timing. */
export function resolveRoomExpiresAtIso(room: RoomData | null | undefined): string | null {
  if (!room) return null;
  if ("expiresAt" in room) {
    return parseExpiresAt(room.expiresAt);
  }
  return null;
}
