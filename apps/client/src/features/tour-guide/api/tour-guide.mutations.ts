'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type { WelcomeTourStatusData } from './tour-guide.queries';

export function useMarkWelcomeTourSeen() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<void>(API_ENDPOINTS.PROFILE.WELCOME_TOUR_SEEN, {
        method: 'POST',
      }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.tourGuide.welcomeStatus });
      const previous = qc.getQueryData<WelcomeTourStatusData>(queryKeys.tourGuide.welcomeStatus);
      qc.setQueryData<WelcomeTourStatusData>(queryKeys.tourGuide.welcomeStatus, {
        eligible: false,
        seenAt: previous?.seenAt ?? new Date().toISOString(),
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.tourGuide.welcomeStatus, context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tourGuide.welcomeStatus });
    },
  });
}
