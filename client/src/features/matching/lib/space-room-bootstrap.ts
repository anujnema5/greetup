/**
 * Short-lived peer + match score for `/space/[roomId]` without query params.
 * Cleared after GET `/room/:id` succeeds (server is then the source of truth).
 */
import { spaceRoomPath } from "@/features/room/lib/navigation/space-routes";

const STORAGE_KEY = (roomId: string) => `greetup-space-room-bootstrap:${roomId}`;

export type SpaceRoomBootstrap = {
  peerId: string | null;
  score: string | null;
};

function readStored(roomId: string): SpaceRoomBootstrap | null {
  if (!roomId) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY(roomId));
    if (!raw) return null;
    const o = JSON.parse(raw) as { peerId?: unknown; score?: unknown };
    return {
      peerId: typeof o.peerId === "string" && o.peerId ? o.peerId : null,
      score: o.score == null ? null : String(o.score),
    };
  } catch {
    return null;
  }
}

export function stashSpaceRoomBootstrap(roomId: string, data: SpaceRoomBootstrap): void {
  if (!roomId) return;
  try {
    sessionStorage.setItem(STORAGE_KEY(roomId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

/** Merge URL query + sessionStorage seeds for direct-room bootstrap until GET `/room/:id` succeeds. */
export function readSpaceRoomSeeds(
  roomId: string,
  queryPeer: string | null,
  queryScore: string | null,
): { seedPeerId: string | null; seedScore: string | null } {
  const stored = readStored(roomId);
  return {
    seedPeerId: queryPeer ?? stored?.peerId ?? null,
    seedScore: queryScore ?? stored?.score ?? null,
  };
}

/** `?peer=&score=` → storage + clean URL (one write, one navigation). */
export function migrateLegacySpaceRoomQuery(
  roomId: string,
  queryPeer: string | null,
  queryScore: string | null,
  replace: (path: string) => void,
): void {
  if (!roomId || (!queryPeer && !queryScore)) return;
  stashSpaceRoomBootstrap(roomId, { peerId: queryPeer, score: queryScore });
  replace(spaceRoomPath(roomId));
}

export function clearSpaceRoomBootstrap(roomId: string): void {
  if (!roomId) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY(roomId));
  } catch {
    /* ignore */
  }
}
