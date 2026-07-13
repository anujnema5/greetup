'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

type OnlinePeopleCountData = {
  onlinePeopleCount: number;
};

type UseOnlinePeopleCountQueryOptions = {
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
};

export function useOnlinePeopleCountQuery(options?: UseOnlinePeopleCountQueryOptions) {
  return useQuery({
    queryKey: queryKeys.presence.onlineCount,
    queryFn: async () => {
      const data = await apiFetch<OnlinePeopleCountData>(
        API_ENDPOINTS.PRESENCE.ONLINE_PEOPLE_COUNT,
      );
      return data?.onlinePeopleCount ?? 0;
    },
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnReconnect: true,
  });
}
