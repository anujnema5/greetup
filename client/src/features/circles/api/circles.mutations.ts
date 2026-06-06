'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { ApiError } from '@/lib/api/fetch-client';
import { API_BASE_URL } from '@/shared/constants/environments';
import type { ApiResponse } from '@/features/profile-setup/types/profile-setup-api.types';

import { invalidateCirclesCaches } from '../lib/invalidate-circles-cache';
import type {
  CreateCircleRequest,
  CreateCircleResult,
  DeleteScheduledCircleResult,
  UpdateScheduledCircleRequest,
  UpdateScheduledCircleResult,
} from '../types/circles-api.types';

const { CIRCLES } = API_ENDPOINTS;

export type CreateCircleMutationResult = {
  data: CreateCircleResult;
  message?: string;
};

export type UpdateScheduledCircleArg = {
  roomId: string;
  body: UpdateScheduledCircleRequest;
};

async function fetchCreateCircleEnvelope(
  body: CreateCircleRequest,
): Promise<CreateCircleMutationResult> {
  const res = await fetch(`${API_BASE_URL}${CIRCLES.CREATE}`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const json = (await res.json()) as ApiResponse<CreateCircleResult>;
  if (!json.success || !json.data) {
    throw new Error(json.message ?? 'Could not create circle');
  }
  return { data: json.data, message: json.message };
}

export function useCreateCircle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: fetchCreateCircleEnvelope,
    onSuccess: () => {
      invalidateCirclesCaches(qc, { includeBrowseNiches: true });
    },
  });
}

export function useUpdateScheduledCircle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, body }: UpdateScheduledCircleArg) =>
      apiFetch<UpdateScheduledCircleResult>(CIRCLES.room(roomId), {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateCirclesCaches(qc);
    },
  });
}

export function useDeleteScheduledCircle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) =>
      apiFetch<DeleteScheduledCircleResult>(CIRCLES.room(roomId), {
        method: 'DELETE',
      }),
    onSuccess: () => {
      invalidateCirclesCaches(qc);
    },
  });
}
