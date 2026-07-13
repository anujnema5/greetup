'use client';

import { useMutation } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/lib/api';
import { ApiError } from '@/lib/api/fetch-client';
import { API_BASE_URL } from '@/shared/constants/environments';
import type { ApiResponse } from '@/features/profile-setup/types/profile-setup-api.types';

import type {
  ConnectionCallInitiateResult,
  ConnectionCallMode,
  ConnectionCallRespondResult,
} from '../types/connection-call.types';

const { CONNECTIONS } = API_ENDPOINTS;

export type InitiateConnectionCallArg = {
  conversationId: string;
  mode: ConnectionCallMode;
};

export type RespondConnectionCallArg = {
  requestId: string;
  accept: boolean;
};

export type CancelConnectionCallArg = {
  requestId: string;
  reason?: 'cancelled' | 'no_answer';
};

export type MarkConnectionCallMissedArg = {
  requestId: string;
};

async function connectionCallEnvelope<T>(
  path: string,
  init?: RequestInit,
  fallbackMessage = 'Request failed',
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()) as ApiResponse<T>;
}

async function connectionCallFetch<T>(
  path: string,
  init?: RequestInit,
  fallbackMessage = 'Request failed',
): Promise<T> {
  const json = await connectionCallEnvelope<T>(path, init, fallbackMessage);
  if (!json.success || json.data == null) {
    throw new Error(json.message ?? fallbackMessage);
  }
  return json.data;
}

export function useInitiateConnectionCall() {
  return useMutation({
    mutationFn: (body: InitiateConnectionCallArg) =>
      connectionCallFetch<ConnectionCallInitiateResult>(
        CONNECTIONS.CALLS,
        { method: 'POST', body: JSON.stringify(body) },
        'Could not start call',
      ),
  });
}

export function useRespondConnectionCall() {
  return useMutation({
    mutationFn: ({ requestId, accept }: RespondConnectionCallArg) =>
      connectionCallFetch<ConnectionCallRespondResult>(
        CONNECTIONS.callRespond(requestId),
        { method: 'POST', body: JSON.stringify({ accept }) },
        'Could not respond to call',
      ),
  });
}

export function useCancelConnectionCall() {
  return useMutation({
    mutationFn: async ({ requestId, reason }: CancelConnectionCallArg) => {
      const json = await connectionCallEnvelope<{ cancelled: boolean }>(
        CONNECTIONS.callCancel(requestId),
        {
          method: 'POST',
          body: JSON.stringify(reason ? { reason } : {}),
        },
      );
      if (!json.success) {
        throw new Error(json.message ?? 'Could not cancel call');
      }
      return json.data ?? { cancelled: true };
    },
  });
}

export function useMarkConnectionCallMissed() {
  return useMutation({
    mutationFn: async ({ requestId }: MarkConnectionCallMissedArg) => {
      const json = await connectionCallEnvelope<{ missed: boolean }>(
        CONNECTIONS.callMissed(requestId),
        { method: 'POST' },
      );
      if (!json.success) {
        throw new Error(json.message ?? 'Could not mark call missed');
      }
      return json.data ?? { missed: true };
    },
  });
}
