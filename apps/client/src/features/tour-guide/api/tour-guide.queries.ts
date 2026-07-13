'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

export type WelcomeTourStatusData = {
  eligible: boolean;
  seenAt: string | null;
};

type UseWelcomeTourStatusOptions = {
  enabled?: boolean;
};

export function useWelcomeTourStatus(options?: UseWelcomeTourStatusOptions) {
  return useQuery({
    queryKey: queryKeys.tourGuide.welcomeStatus,
    queryFn: async () => {
      const data = await apiFetch<WelcomeTourStatusData | null | undefined>(
        API_ENDPOINTS.PROFILE.WELCOME_TOUR_STATUS,
      );
      return data ?? { eligible: false, seenAt: null };
    },
    enabled: options?.enabled ?? true,
  });
}
