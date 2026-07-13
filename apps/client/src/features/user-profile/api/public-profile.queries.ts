'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import { publicProfileCacheId } from './public-profile-cache-id';
import type { PublicProfileData } from '../types/public-profile.types';

type UsePublicProfileOptions = {
  enabled?: boolean;
  refetchOnMount?: boolean | 'always';
};

async function fetchPublicProfile(username: string): Promise<PublicProfileData> {
  const cacheId = publicProfileCacheId(username);
  const data = await apiFetch<PublicProfileData | null | undefined>(
    API_ENDPOINTS.PROFILE.public(cacheId),
  );
  if (!data) {
    throw new Error('INVALID_PROFILE_RESPONSE');
  }
  return data;
}

export function usePublicProfile(username: string, options?: UsePublicProfileOptions) {
  const cacheId = publicProfileCacheId(username);

  return useQuery({
    queryKey: queryKeys.publicProfile.byUsername(cacheId),
    queryFn: () => fetchPublicProfile(username),
    enabled: (options?.enabled ?? true) && Boolean(cacheId),
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: options?.refetchOnMount ?? 'always',
  });
}
