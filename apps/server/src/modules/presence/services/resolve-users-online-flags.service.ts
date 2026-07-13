import { retainLiveOnlineUserIds } from "./live-online-users.service";

/** Batch socket-presence check — TTL'd presence hash is source of truth. */
export async function resolveUsersOnlineFlags(
  userIds: string[],
): Promise<Map<string, boolean>> {
  const unique = [...new Set(userIds.filter((id) => id.length > 0))];
  const out = new Map<string, boolean>();
  if (unique.length === 0) return out;

  const live = new Set(await retainLiveOnlineUserIds(unique));
  for (const id of unique) {
    out.set(id, live.has(id));
  }
  return out;
}
