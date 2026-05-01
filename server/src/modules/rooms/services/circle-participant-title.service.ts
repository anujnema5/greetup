import { roomInviteRepository } from "@/modules/rooms/repositories/expand-direct-room.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { patchSessionRoomRedisTitle } from "@/modules/rooms/services/session-room-redis.service";

const TITLE_MAX = 160;

/** First word of a display/name label, for titles like "Anuj, Rishi, Shreyansh". */
export function firstNameFromLabel(label: string): string {
  const token = label.trim().split(/\s+/).filter(Boolean)[0];
  if (!token) return "Member";
  return token;
}

export function formatCircleTitleFromDisplayLabels(labels: string[]): string {
  if (labels.length === 0) return "Circle";
  const parts = labels.map((l) => firstNameFromLabel(l));
  let joined = parts.join(", ");
  if (joined.length <= TITLE_MAX) return joined;
  for (let n = parts.length; n >= 1; n--) {
    const head = parts.slice(0, n).join(", ");
    const extra = parts.length - n;
    const candidate = extra > 0 ? `${head}, +${extra}` : head;
    if (candidate.length <= TITLE_MAX) return candidate;
  }
  return parts[0]!.slice(0, Math.max(1, TITLE_MAX - 1)) + "…";
}

/**
 * Sets `rooms.title` and Redis session `title` from active participants (first names).
 * Used when a direct call becomes a circle so the room name matches who is on the call.
 */
export async function syncCircleRoomTitleFromParticipants(roomId: string): Promise<string> {
  const ids = await roomsRepository.listActiveParticipantUserIds(roomId);
  const pairs =
    ids.length > 0
      ? await Promise.all(
          ids.map(async (id) => {
            const label = await roomInviteRepository.findDisplayLabelForUser(id);
            return {
              id,
              label,
              firstKey: firstNameFromLabel(label).toLowerCase(),
            };
          }),
        )
      : [];
  pairs.sort((a, b) => a.firstKey.localeCompare(b.firstKey) || a.id.localeCompare(b.id));
  const labels = pairs.map((p) => p.label);
  const title = formatCircleTitleFromDisplayLabels(labels);
  await roomsRepository.updateLiveRoomTitle(roomId, title);
  await patchSessionRoomRedisTitle(roomId, title);
  return title;
}
