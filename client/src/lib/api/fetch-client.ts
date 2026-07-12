import { authClient } from '@/lib/auth-client';
import { API_BASE_URL } from '@/shared/constants/environments';

import { resolveGuestTryApiErrorMessage } from './guest-try-errors';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

/** App-shell paths that must not stay mounted without a valid session. */
const AUTH_REQUIRED_PATH_PREFIXES = [
  '/home',
  '/profile',
  '/settings',
  '/profile-setup',
  '/explore',
  '/connections',
  '/u',
  '/messages',
  '/spaces',
  '/open-now',
  '/chat',
  '/space',
];

let unauthorizedRedirectInFlight = false;

function isAuthRequiredPath(pathname: string): boolean {
  if (pathname === '/try' || pathname.startsWith('/try/')) return false;
  // Anonymous deep-link into a match room is handled by /try, not login.
  if (
    /^\/space\/[^/]+$/.test(pathname) &&
    pathname !== '/space/search' &&
    !pathname.startsWith('/space/search/')
  ) {
    return false;
  }
  return AUTH_REQUIRED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Clear dead session cookie and leave protected UI when APIs reject auth. */
function redirectToLoginOnUnauthorized(): void {
  if (typeof window === 'undefined' || unauthorizedRedirectInFlight) return;

  const { pathname } = window.location;
  if (pathname === '/login' || pathname.startsWith('/login/')) return;
  if (!isAuthRequiredPath(pathname)) return;

  unauthorizedRedirectInFlight = true;
  const params = new URLSearchParams();
  params.set('redirect', pathname);
  const loginUrl = `/login?${params.toString()}`;

  void authClient
    .signOut()
    .catch(() => {
      /* cookie may already be invalid */
    })
    .finally(() => {
      window.location.replace(loginUrl);
    });
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
  const guestMessage = resolveGuestTryApiErrorMessage(error);
  if (guestMessage) {
    return guestMessage;
  }

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
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) {
      redirectToLoginOnUnauthorized();
    }
    throw new ApiError(res.status, body);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}
