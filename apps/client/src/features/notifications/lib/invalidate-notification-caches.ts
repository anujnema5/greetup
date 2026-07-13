import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

export function invalidateNotificationCaches(qc: QueryClient = queryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
}
