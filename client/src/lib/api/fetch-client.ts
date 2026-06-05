import { API_BASE_URL } from '@/shared/constants/environments';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

function messageFromApiBody(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as {
      message?: unknown;
      errors?: Array<{ field: string; messages: string[] }>;
    };
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      const first = parsed.errors[0]?.messages?.[0];
      if (typeof first === 'string' && first.trim().length > 0) return first;
    }
    if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
      return parsed.message;
    }
  } catch {
    /* not JSON */
  }
  const trimmed = body.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** API envelope `code` when present (e.g. `LOBBY_WAITING_FOR_HOST`). */
export function getApiErrorCode(error: unknown): string | null {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.body) as { code?: unknown };
      const code = parsed.code;
      return typeof code === 'string' && code.length > 0 ? code : null;
    } catch {
      return null;
    }
  }
  if (typeof error === 'object' && error !== null) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'code' in data) {
      const code = (data as { code?: unknown }).code;
      return typeof code === 'string' && code.length > 0 ? code : null;
    }
  }
  return null;
}

/** Human-readable message from `ApiError` or other thrown error shapes. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return messageFromApiBody(error.body) ?? fallback;
  }
  if (error && typeof error === 'object') {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'string' && data.trim().length > 0) return data;
    if (data && typeof data === 'object') {
      const fromData = messageFromApiBody(JSON.stringify(data));
      if (fromData) return fromData;
    }
    const top = (error as { error?: unknown; message?: unknown }).error;
    if (typeof top === 'string' && top.trim().length > 0) return top;
    if (error instanceof Error && error.message.trim().length > 0) return error.message;
  }
  return fallback;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const json = await res.json();
  return (json.data ?? json) as T;
}
