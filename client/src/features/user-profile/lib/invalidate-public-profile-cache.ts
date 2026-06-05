import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

import { publicProfileCacheId } from '../api/public-profile-cache-id';

export function invalidatePublicProfileCache(
  username: string | null | undefined,
  qc: QueryClient = queryClient,
) {
  const normalized = username?.trim();
  if (!normalized) return;

  const cacheId = publicProfileCacheId(normalized);
  void qc.invalidateQueries({ queryKey: queryKeys.publicProfile.byUsername(cacheId) });
}
