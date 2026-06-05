'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type { MatchPeerPreview } from '../types/matching-api.types';

const { MATCHING } = API_ENDPOINTS;

type UseMatchPeerPreviewOptions = {
  enabled?: boolean;
};

export function useMatchPeerPreview(
  peerUserId: string,
  options?: UseMatchPeerPreviewOptions,
) {
  const id = peerUserId.trim();

  return useQuery({
    queryKey: queryKeys.matching.peerPreview(id),
    queryFn: async () => {
      const data = await apiFetch<MatchPeerPreview | null | undefined>(
        MATCHING.peerPreview(id),
      );
      if (!data) {
        throw new Error('Could not load peer');
      }
      return data;
    },
    enabled: (options?.enabled ?? true) && Boolean(id),
  });
}
