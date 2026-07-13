import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

export function invalidateSuggestedPeopleCache(qc: QueryClient = queryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.explore.suggestedPeople });
}
