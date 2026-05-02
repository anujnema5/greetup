/**
 * Cross-tab lease for `/circle/[roomId]`: one browser tab per user per room.
 * Uses localStorage (shared) + timestamps; heartbeats keep the lease alive while the call runs.
 */

/** Ignore leases older than this when detecting a duplicate tab. */
export const ROOM_TAB_LEASE_TTL_MS = 20_000;

/** How often the owning tab refreshes `ts` while `activeRoomId` is set (see RTC provider). */
export const ROOM_TAB_LEASE_HEARTBEAT_MS = 4_000;

const TAB_INSTANCE_KEY = "greetup-tab-instance-id";

export type RoomTabLease = {
  tabId: string;
  roomId: string;
  ts: number;
};

function leaseStorageKey(userId: string): string {
  return `greetup-room-tab-lease:${userId}`;
}

export function getOrCreateTabInstanceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(TAB_INSTANCE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(TAB_INSTANCE_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}-fallback`;
  }
}

export function readRoomTabLease(userId: string): RoomTabLease | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(leaseStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as RoomTabLease).tabId !== "string" ||
      typeof (parsed as RoomTabLease).roomId !== "string" ||
      typeof (parsed as RoomTabLease).ts !== "number"
    ) {
      return null;
    }
    return parsed as RoomTabLease;
  } catch {
    return null;
  }
}

export function writeRoomTabLease(userId: string, lease: RoomTabLease): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(leaseStorageKey(userId), JSON.stringify(lease));
  } catch {
    /* ignore */
  }
}

/** Refresh lease timestamp if this tab still owns it for the given room. */
export function touchRoomTabLease(userId: string, roomId: string, tabId: string): void {
  const cur = readRoomTabLease(userId);
  if (!cur || cur.tabId !== tabId || cur.roomId !== roomId) return;
  writeRoomTabLease(userId, { tabId, roomId, ts: Date.now() });
}

export function clearRoomTabLeaseIfOwner(userId: string, tabId: string): void {
  const cur = readRoomTabLease(userId);
  if (!cur || cur.tabId !== tabId) return;
  try {
    localStorage.removeItem(leaseStorageKey(userId));
  } catch {
    /* ignore */
  }
}

/**
 * True when another tab holds a non-stale lease for the same room.
 */
export function isOtherTabActiveInSameRoom(
  userId: string,
  roomId: string,
  myTabId: string,
  maxAgeMs = ROOM_TAB_LEASE_TTL_MS,
): boolean {
  const lease = readRoomTabLease(userId);
  if (!lease) return false;
  if (lease.roomId !== roomId) return false;
  if (lease.tabId === myTabId) return false;
  return Date.now() - lease.ts <= maxAgeMs;
}
