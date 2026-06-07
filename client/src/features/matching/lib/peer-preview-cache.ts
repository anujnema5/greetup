import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import type { PublicProfileConnectionState } from '@/features/user-profile/types/public-profile.types';

import type { MatchPeerPreview } from '../types/matching-api.types';

/** Updates cached match peer preview connection fields without a network round-trip. */
export function patchMatchPeerPreviewCache(
  peerUserId: string,
  patch: {
    connectionState: PublicProfileConnectionState;
    connectionId: string | null;
  },
  qc: QueryClient = queryClient,
): void {
  const id = peerUserId.trim();
  if (!id) return;

  qc.setQueryData<MatchPeerPreview>(queryKeys.matching.peerPreview(id), (draft) => {
    if (!draft) return draft;
    return {
      ...draft,
      connectionState: patch.connectionState,
      connectionId: patch.connectionId,
    };
  });
}
