'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';

import { invalidateAfterBlockAction } from '../lib/invalidate-after-block-action';
import type { BlockUserMutationArg } from '../types/blocks-api.types';

const { BLOCKS } = API_ENDPOINTS;

export function useBlockUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ targetUserId }: BlockUserMutationArg) =>
      apiFetch<{ ok: true }>(BLOCKS.LIST, {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      }),
    onSuccess: (_result, arg) => {
      invalidateAfterBlockAction(qc, arg);
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ targetUserId }: BlockUserMutationArg) =>
      apiFetch<{ ok: true }>(BLOCKS.user(targetUserId), {
        method: 'DELETE',
      }),
    onSuccess: (_result, arg) => {
      invalidateAfterBlockAction(qc, arg);
    },
  });
}
