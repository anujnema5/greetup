import { ApiError } from '@/lib/api/fetch-client';
import { API_BASE_URL } from '@/shared/constants/environments';

import type { RoomApiEnvelope } from '../types/api/room-api.types';

export async function roomApiEnvelope<T>(
  path: string,
  init?: RequestInit,
): Promise<RoomApiEnvelope<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()) as RoomApiEnvelope<T>;
}

export async function roomApiFetch<T>(
  path: string,
  init?: RequestInit,
  fallbackMessage = 'Request failed',
): Promise<T> {
  const json = await roomApiEnvelope<T>(path, init);
  if (!json.success) {
    throw new Error(json.message ?? fallbackMessage);
  }
  return json.data as T;
}

export async function roomApiVoid(
  path: string,
  init?: RequestInit,
  fallbackMessage = 'Request failed',
): Promise<void> {
  const json = await roomApiEnvelope<unknown>(path, init);
  if (!json.success) {
    throw new Error(json.message ?? fallbackMessage);
  }
}
