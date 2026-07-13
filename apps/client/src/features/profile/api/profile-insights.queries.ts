'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch, buildQueryParams } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type { ProfileInsightsData } from '../types/profile-insights.types';

export const PROFILE_INSIGHTS_RECENT_MATCHES_LIMIT = 50;

export type GetProfileInsightsArgs = {
  recentLimit?: number;
};

type UseProfileInsightsOptions = {
  enabled?: boolean;
  refetchOnMount?: boolean | 'always';
  refetchOnWindowFocus?: boolean;
};

async function fetchProfileInsights(arg?: GetProfileInsightsArgs): Promise<ProfileInsightsData> {
  const recentLimit = arg?.recentLimit;
  const qs = buildQueryParams({ recentLimit });
  const path = qs
    ? `${API_ENDPOINTS.PROFILE.ME_INSIGHTS}?${qs}`
    : API_ENDPOINTS.PROFILE.ME_INSIGHTS;
  const data = await apiFetch<ProfileInsightsData | null | undefined>(path);
  if (!data) {
    throw new Error('Profile insights response missing data');
  }
  return data;
}

export function useProfileInsights(
  arg?: GetProfileInsightsArgs,
  options?: UseProfileInsightsOptions,
) {
  const recentLimit = arg?.recentLimit;

  return useQuery({
    queryKey: queryKeys.profile.insights(recentLimit),
    queryFn: () => fetchProfileInsights(arg),
    enabled: options?.enabled ?? true,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  });
}
