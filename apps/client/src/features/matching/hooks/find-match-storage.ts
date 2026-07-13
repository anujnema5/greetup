import type { MutableRefObject } from 'react';

/** Persists active match attempt id for refresh / multi-tab alignment with engine `requestId`. */
const MATCH_REQUEST_STORAGE_KEY = 'match:requestId';

export function persistMatchAttemptId(
  requestIdRef: MutableRefObject<string | null>,
  attemptId: string,
): void {
  requestIdRef.current = attemptId;
  localStorage.setItem(MATCH_REQUEST_STORAGE_KEY, attemptId);
}

export function clearMatchAttemptLocal(
  proposalPeerIdRef: MutableRefObject<string | null>,
  requestIdRef: MutableRefObject<string | null>,
): void {
  proposalPeerIdRef.current = null;
  localStorage.removeItem(MATCH_REQUEST_STORAGE_KEY);
  requestIdRef.current = null;
}

export function readStoredMatchAttemptId(): string | null {
  return localStorage.getItem(MATCH_REQUEST_STORAGE_KEY);
}
