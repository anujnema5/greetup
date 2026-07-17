'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuestTryStatus } from '@/features/guest-try/hooks/use-guest-try-status';
import type { MyProfileResponse } from '@/features/profile/types/my-profile.types';
import { API_ENDPOINTS, apiFetch, buildQueryParams } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { queryKeys } from '@/lib/query/keys';

import type {
  MatchPrepCurrentData,
  MatchPrepOptionsData,
  ProfileSetupData,
  ResolvedLocationSuggestionData,
} from '../types/profile-setup-api.types';

const { PROFILE } = API_ENDPOINTS;

type UseMyProfileOptions = {
  enabled?: boolean;
  refetchOnMount?: boolean | 'always';
};

export function useProfileSetupSteps(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.profileSetup.steps,
    queryFn: async () => {
      const qs = buildQueryParams({ limit: 10 });
      const data = await apiFetch<ProfileSetupData | null | undefined>(
        `${PROFILE.SETUP_STEPS}?${qs}`,
      );
      if (!data) {
        throw new Error('Could not load profile setup steps');
      }
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Full-account profile only. Guests get 403 on `/profile/me` — wait until guest
 * status confirms a member before fetching (avoids noisy logs on `/try`).
 */
export function useMyProfile(options?: UseMyProfileOptions) {
  const { data: session, isPending: sessionPending } = useSession();
  const hasSession = Boolean(session?.user);
  const { data: guestStatus, isPending: guestPending } = useGuestTryStatus({
    enabled: !sessionPending && hasSession,
  });
  const isMember = guestStatus?.isGuest === false;
  const memberReady = !sessionPending && hasSession && !guestPending && isMember;

  return useQuery({
    queryKey: queryKeys.profileSetup.myProfile,
    queryFn: () => apiFetch<MyProfileResponse>(PROFILE.ME),
    enabled: (options?.enabled ?? true) && memberReady,
    refetchOnMount: options?.refetchOnMount,
  });
}

type UseMatchPrepQueryOptions = {
  enabled?: boolean;
};

export function useMatchPrepCurrent(options?: UseMatchPrepQueryOptions) {
  return useQuery({
    queryKey: queryKeys.profileSetup.matchPrepCurrent,
    queryFn: async () => {
      const data = await apiFetch<MatchPrepCurrentData | null | undefined>(
        PROFILE.MATCH_PREP_CURRENT,
      );
      if (!data) {
        throw new Error('Could not load saved match prep');
      }
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useMatchPrepOptions(options?: UseMatchPrepQueryOptions) {
  return useQuery({
    queryKey: queryKeys.profileSetup.matchPrepOptions,
    queryFn: async () => {
      const data = await apiFetch<MatchPrepOptionsData | null | undefined>(
        PROFILE.MATCH_PREP_OPTIONS,
      );
      if (!data) {
        throw new Error('Could not load match prep options');
      }
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useMatchPrepPromptStatus(
  clientSessionId: string,
  options?: { enabled?: boolean },
) {
  const id = clientSessionId.trim();

  return useQuery({
    queryKey: queryKeys.profileSetup.matchPrepPrompt(id),
    queryFn: async () => {
      const qs = buildQueryParams({ clientSessionId: id });
      const data = await apiFetch<{ shouldShow: boolean } | null | undefined>(
        `${PROFILE.MATCH_PREP_PROMPT_STATUS}?${qs}`,
      );
      if (!data) {
        throw new Error('Could not load prompt status');
      }
      return data;
    },
    enabled: (options?.enabled ?? true) && Boolean(id),
  });
}

export async function fetchLocationSuggestions(args: {
  query: string;
  limit?: number;
}): Promise<ResolvedLocationSuggestionData[]> {
  const limit = args.limit ?? 5;
  const qs = buildQueryParams({ query: args.query, limit });
  const data = await apiFetch<{ suggestions: ResolvedLocationSuggestionData[] } | null | undefined>(
    `${PROFILE.LOCATION_SUGGESTIONS}?${qs}`,
  );
  return data?.suggestions ?? [];
}

export function useFetchLocationSuggestions() {
  const qc = useQueryClient();

  return useCallback(
    (args: { query: string; limit?: number }) => {
      const limit = args.limit ?? 5;
      const query = args.query.trim();
      return qc.fetchQuery({
        queryKey: queryKeys.profileSetup.locationSuggestions(query, limit),
        queryFn: () => fetchLocationSuggestions({ query, limit }),
      });
    },
    [qc],
  );
}
