import { USER_PRESENCE_KEYS } from "@/core/redis/keys";

/** Per-user presence hash — has TTL; source of truth for "is online". */
export function userPresenceHashKey(userId: string): string {
  return `${USER_PRESENCE_KEYS.ONLINE_USER_IPS}${userId}`;
}
