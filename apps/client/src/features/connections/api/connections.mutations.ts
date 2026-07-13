'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { API_BASE_URL } from '@/shared/constants/environments';
import { ApiError } from '@/lib/api/fetch-client';

import {
  invalidateAfterAcceptOrRejectConnection,
  invalidateAfterDisconnectOrWithdraw,
  invalidateAfterRequestConnection,
} from '../lib/invalidate-after-connection-action';
import type {
  RequestConnectionMutationArg,
  RequestConnectionResult,
  RespondConnectionMutationArg,
} from '../types/connections-api.types';

const { CONNECTIONS } = API_ENDPOINTS;

async function requestConnection(
  body: RequestConnectionMutationArg,
): Promise<RequestConnectionResult> {
  const res = await fetch(`${API_BASE_URL}${CONNECTIONS.REQUEST}`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId: body.targetUserId }),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()) as RequestConnectionResult;
}

export function useRequestConnection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: requestConnection,
    onSuccess: (_result, arg) => {
      invalidateAfterRequestConnection(qc, arg);
    },
  });
}

export function useAcceptConnection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId }: RespondConnectionMutationArg) =>
      apiFetch(CONNECTIONS.accept(connectionId), { method: 'POST' }),
    onSuccess: (_result, arg) => {
      invalidateAfterAcceptOrRejectConnection(qc, arg);
    },
  });
}

export function useRejectConnection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId }: RespondConnectionMutationArg) =>
      apiFetch(CONNECTIONS.reject(connectionId), { method: 'POST' }),
    onSuccess: (_result, arg) => {
      invalidateAfterAcceptOrRejectConnection(qc, arg);
    },
  });
}

export function useDisconnectConnection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId }: RespondConnectionMutationArg) =>
      apiFetch(CONNECTIONS.disconnect(connectionId), { method: 'POST' }),
    onSuccess: (_result, arg) => {
      invalidateAfterDisconnectOrWithdraw(qc, arg);
    },
  });
}

export function useWithdrawConnectionRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId }: RespondConnectionMutationArg) =>
      apiFetch(CONNECTIONS.withdraw(connectionId), { method: 'POST' }),
    onSuccess: (_result, arg) => {
      invalidateAfterDisconnectOrWithdraw(qc, arg);
    },
  });
}
