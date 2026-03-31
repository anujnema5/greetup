'use client';

import { useEffect, useRef, useState } from 'react';
import { useFindMatchMutation, useCancelMatchMutation } from '../api/matching-api';
import { useSocket } from '@/lib/socket';

type MatchStatus = 'idle' | 'searching' | 'matched' | 'error';

export interface MatchResult {
  requestId: string;
  roomId?: string;
  peerId?: string;
  matchScore?: number;
  isFallbackMatch?: boolean;
}

const STORAGE_KEY = 'match:requestId';

function messageForFailedStart(reason: string | undefined): string {
  switch (reason) {
    case 'user_unavailable':
      return 'Still marked as in a room. Open the room page and use End/Leave, or wait a few minutes and try again.';
    case 'snapshot_not_found':
      return 'Could not start matchmaking. Make sure your profile is complete.';
    default:
      return 'Could not start matchmaking. Please try again.';
  }
}

function messageForNoMatch(reason: string): string {
  switch (reason) {
    case 'pool_empty':
      return 'No one else was searching just then. Try again in a moment.';
    case 'no_compatible_candidate':
      return 'No compatible match right now. Try widening preferences or try again in a moment.';
    default:
      return 'No match found. Try again in a moment.';
  }
}

export function useFindMatch() {
  const [status, setStatus] = useState<MatchStatus>('idle');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [findMatch, { isLoading: isStarting }] = useFindMatchMutation();
  const [cancelMatch] = useCancelMatchMutation();
  const { socket } = useSocket();

  // Track whether this hook instance initiated the search so we can
  // restore state from localStorage on mount (handles page refresh).
  const requestIdRef = useRef<string | null>(null);

  // On mount: restore any in-progress search from localStorage.
  // The server will also push match:state on socket connect, this just
  // pre-sets the UI immediately before the socket event arrives.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      requestIdRef.current = stored;
      setStatus('searching');
    }
  }, []);

  useEffect(() => {
    // match:completed — fired by the webhook handler when matching engine finds a pair
    const onMatchCompleted = (data: {
      roomId: string;
      attemptId: string;
      matchScore: number;
      isFallbackMatch: boolean;
      peerId: string;
    }) => {
      const requestId = requestIdRef.current ?? localStorage.getItem(STORAGE_KEY) ?? data.attemptId;
      localStorage.removeItem(STORAGE_KEY);
      requestIdRef.current = null;
      setStatus('matched');
      setResult({ requestId, roomId: data.roomId, peerId: data.peerId, matchScore: data.matchScore, isFallbackMatch: data.isFallbackMatch });
    };

    // match:state — fired by the server on every socket connect to restore client state
    const onMatchState = (data: {
      status: 'searching' | 'matched' | 'idle';
      requestId?: string;
      roomId?: string;
    }) => {
      if (data.status === 'searching' && data.requestId) {
        requestIdRef.current = data.requestId;
        localStorage.setItem(STORAGE_KEY, data.requestId);
        setStatus('searching');
      } else if (data.status === 'matched' && data.roomId) {
        const requestId = data.requestId ?? requestIdRef.current ?? '';
        localStorage.removeItem(STORAGE_KEY);
        requestIdRef.current = null;
        setStatus('matched');
        setResult({ requestId, roomId: data.roomId });
      } else if (data.status === 'idle') {
        // Grace period expired while offline — server already removed from pool
        localStorage.removeItem(STORAGE_KEY);
        requestIdRef.current = null;
        setStatus('idle');
      }
    };

    // match:no_match — fired when the engine exhausts all retries with no compatible candidate
    const onMatchNoMatch = (data: { attemptId: string; reason: string }) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        localStorage.removeItem(STORAGE_KEY);
        requestIdRef.current = null;
        setStatus('error');
        setError(messageForNoMatch(data.reason));
      }
    };

    socket.on('match:completed', onMatchCompleted);
    socket.on('match:state', onMatchState);
    socket.on('match:no_match', onMatchNoMatch);

    return () => {
      socket.off('match:completed', onMatchCompleted);
      socket.off('match:state', onMatchState);
      socket.off('match:no_match', onMatchNoMatch);
    };
  }, [socket]);

  const findAMatch = async () => {
    try {
      setStatus('searching');
      setResult(null);
      setError(null);

      const res = await findMatch().unwrap();
      const { requestId, status: engineStatus, reason } = res.data;

      if (engineStatus === 'no_match') {
        setStatus('error');
        setError(messageForFailedStart(reason));
        return;
      }

      requestIdRef.current = requestId;
      localStorage.setItem(STORAGE_KEY, requestId);
    } catch {
      setStatus('error');
      setError('Failed to start matchmaking');
    }
  };

  const cancelSearch = async () => {
    try {
      await cancelMatch().unwrap();
    } catch {
      // best-effort — clear local state regardless
    }
    localStorage.removeItem(STORAGE_KEY);
    requestIdRef.current = null;
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  return {
    findAMatch,
    cancelSearch,
    status,
    result,
    error,
    isSearching: status === 'searching',
    isLoading: isStarting || status === 'searching',
  };
}
