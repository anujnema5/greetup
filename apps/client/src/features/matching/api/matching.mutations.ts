'use client';

import { useMutation } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';

import type { FindMatchResponse } from '../types/matching-api.types';

const { MATCHING } = API_ENDPOINTS;

export type FindMatchData = FindMatchResponse['data'];

export function useFindMatchMutation() {
  return useMutation({
    mutationFn: async () => {
      const data = await apiFetch<FindMatchData | null | undefined>(MATCHING.FIND, {
        method: 'POST',
      });
      if (!data) {
        throw new Error('Failed to start matchmaking');
      }
      return data;
    },
  });
}

export function useCancelMatchMutation() {
  return useMutation({
    mutationFn: () =>
      apiFetch<void>(MATCHING.CANCEL, {
        method: 'POST',
      }),
  });
}

export function useRespondMatchProposalMutation() {
  return useMutation({
    mutationFn: (body: { attemptId: string; decision: 'connect' | 'skip' }) =>
      apiFetch<void>(MATCHING.RESPOND, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}
