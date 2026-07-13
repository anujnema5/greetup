import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

export function invalidateSpacesCaches(
  qc: QueryClient = queryClient,
  options?: { includeBrowseNiches?: boolean },
) {
  void qc.invalidateQueries({ queryKey: queryKeys.spaces.all });
  if (options?.includeBrowseNiches) {
    void qc.invalidateQueries({ queryKey: queryKeys.explore.browseNiches });
  }
}
