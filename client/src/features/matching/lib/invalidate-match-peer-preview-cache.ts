import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

export function invalidateMatchPeerPreviewCache(
  peerUserId: string,
  qc: QueryClient = queryClient,
) {
  const id = peerUserId.trim();
  if (!id) return;

  void qc.invalidateQueries({ queryKey: queryKeys.matching.peerPreview(id) });
}
