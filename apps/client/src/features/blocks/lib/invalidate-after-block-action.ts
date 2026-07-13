import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';

import { invalidateChatCaches } from '@/features/chat/lib/invalidate-chat-caches';
import { invalidateSuggestedPeopleCache } from '@/features/explore/lib/invalidate-suggested-people-cache';
import { invalidatePublicProfileCache } from '@/features/user-profile/lib/invalidate-public-profile-cache';

type InvalidationArg = {
  peerUsername?: string | null;
  conversationId?: string | null;
};

export function invalidateAfterBlockAction(qc: QueryClient, arg?: InvalidationArg) {
  void qc.invalidateQueries({ queryKey: queryKeys.blocks.all });
  invalidatePublicProfileCache(arg?.peerUsername, qc);
  invalidateSuggestedPeopleCache(qc);
  invalidateChatCaches(qc, {
    conversationId: arg?.conversationId ?? undefined,
  });
}
