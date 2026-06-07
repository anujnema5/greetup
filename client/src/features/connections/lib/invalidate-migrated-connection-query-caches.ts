import type { QueryClient } from '@tanstack/react-query';

import { invalidateSuggestedPeopleCache } from '@/features/explore/lib/invalidate-suggested-people-cache';
import { invalidateMatchPeerPreviewCache } from '@/features/matching/lib/invalidate-match-peer-preview-cache';
import { invalidateProfileInsightsCache } from '@/features/profile/lib/invalidate-profile-insights-cache';
import { invalidatePublicProfileCache } from '@/features/user-profile/lib/invalidate-public-profile-cache';
import { queryClient } from '@/lib/query/client';

type ConnectionMutationCacheArg = {
  peerUsername?: string | null;
  invalidatePublicProfileUsername?: string | null;
  peerUserId?: string | null;
  targetUserId?: string | null;
};

/** React Query invalidation for connection-related caches. */
export function invalidateMigratedConnectionQueryCaches(
  arg: ConnectionMutationCacheArg,
  qc: QueryClient = queryClient,
) {
  invalidatePublicProfileCache(arg.peerUsername ?? arg.invalidatePublicProfileUsername, qc);
  invalidateProfileInsightsCache(qc);
  invalidateSuggestedPeopleCache(qc);
  const peerPreviewUserId = arg.peerUserId ?? arg.targetUserId;
  if (peerPreviewUserId) {
    invalidateMatchPeerPreviewCache(peerPreviewUserId, qc);
  }
}
