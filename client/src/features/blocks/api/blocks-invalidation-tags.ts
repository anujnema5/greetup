import { CACHE_EXPLORE_SUGGESTED_PEOPLE } from "@/features/explore/api/suggested-people-cache-tags";
import { publicProfileRtkCacheId } from "@/features/user-profile/api/public-profile-rtk-cache";

const CACHE_CONNECTIONS_LIST = { type: "Connections" as const, id: "LIST" as const };
const CACHE_ACCEPTED_CONNECTIONS_INFINITE = {
  type: "Connections" as const,
  id: "ACCEPTED_INFINITE" as const,
};
const CACHE_CONVERSATIONS_LIST = { type: "Conversations" as const, id: "LIST" as const };
const CACHE_ALL_CONVERSATIONS = { type: "Conversations" as const };

export const CACHE_BLOCKED_USERS_LIST = { type: "Blocks" as const, id: "LIST" as const };

type InvalidationArg = {
  peerUsername?: string | null;
  conversationId?: string | null;
};

/** Tags to refresh after block / unblock so lists, threads, and profile stay accurate. */
export function blocksInvalidationTags(arg?: InvalidationArg | string | null) {
  const normalized: InvalidationArg =
    typeof arg === "string" || arg == null ? { peerUsername: arg ?? undefined } : arg;

  const conversationId = normalized.conversationId?.trim();

  return [
    CACHE_BLOCKED_USERS_LIST,
    CACHE_CONNECTIONS_LIST,
    CACHE_ACCEPTED_CONNECTIONS_INFINITE,
    CACHE_EXPLORE_SUGGESTED_PEOPLE,
    CACHE_CONVERSATIONS_LIST,
    CACHE_ALL_CONVERSATIONS,
    ...(conversationId ? [{ type: "Conversations" as const, id: conversationId }] : []),
    ...(normalized.peerUsername?.trim()
      ? [{ type: "PublicProfile" as const, id: publicProfileRtkCacheId(normalized.peerUsername) }]
      : []),
  ];
}
