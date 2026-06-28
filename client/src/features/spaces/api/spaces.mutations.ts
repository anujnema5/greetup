'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { ApiError } from '@/lib/api/fetch-client';
import { API_BASE_URL } from '@/shared/constants/environments';
import type { ApiResponse } from '@/features/profile-setup/types/profile-setup-api.types';

import { invalidateSpacesCaches } from '../lib/invalidate-spaces-cache';
import type {
  CreateSpaceRequest,
  CreateSpaceResult,
  DeleteScheduledSpaceResult,
  UpdateScheduledSpaceRequest,
  UpdateScheduledSpaceResult,
} from '../types/spaces-api.types';

const { SPACES } = API_ENDPOINTS;

export type CreateSpaceMutationResult = {
  data: CreateSpaceResult;
  message?: string;
};

export type UpdateScheduledSpaceArg = {
  roomId: string;
  body: UpdateScheduledSpaceRequest;
};

async function fetchCreateSpaceEnvelope(
  body: CreateSpaceRequest,
): Promise<CreateSpaceMutationResult> {
  const res = await fetch(`${API_BASE_URL}${SPACES.CREATE}`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const json = (await res.json()) as ApiResponse<CreateSpaceResult>;
  if (!json.success || !json.data) {
    throw new Error(json.message ?? 'Could not create space');
  }
  return { data: json.data, message: json.message };
}

export function useCreateSpace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: fetchCreateSpaceEnvelope,
    onSuccess: () => {
      invalidateSpacesCaches(qc, { includeBrowseNiches: true });
    },
  });
}

export function useUpdateScheduledSpace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, body }: UpdateScheduledSpaceArg) =>
      apiFetch<UpdateScheduledSpaceResult>(SPACES.room(roomId), {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateSpacesCaches(qc);
    },
  });
}

export function useDeleteScheduledSpace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) =>
      apiFetch<DeleteScheduledSpaceResult>(SPACES.room(roomId), {
        method: 'DELETE',
      }),
    onSuccess: () => {
      invalidateSpacesCaches(qc);
    },
  });
}
