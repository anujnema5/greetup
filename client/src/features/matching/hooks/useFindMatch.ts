'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useFindMatchMutation,
  useCancelMatchMutation,
  useRespondMatchProposalMutation,
} from '../api/matching-api';
import { useSocket } from '@/lib/socket';
import {
  messageForFailedStart,
  messageForNoMatch,
  messageForProposalCancelled,
} from './find-match-messages';
import { runSerialized } from './find-match-queue';
import {
  clearMatchAttemptLocal,
  persistMatchAttemptId,
  readStoredMatchAttemptId,
} from './find-match-storage';
import type {
  MatchCompletedPayload,
  MatchNoMatchPayload,
  MatchProposalCancelledPayload,
  MatchProposedPayload,
  MatchStatePayload,
} from './match-socket-types';

type MatchStatus = 'idle' | 'searching' | 'proposed' | 'matched' | 'error';

export interface MatchResult {
  requestId: string;
  roomId?: string;
  peerId?: string;
  matchScore?: number;
  isFallbackMatch?: boolean;
}

export function useFindMatch() {
  const [status, setStatus] = useState<MatchStatus>('idle');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [respondBusy, setRespondBusy] = useState(false);
  /** True after our Connect succeeded until `match:completed` or proposal ends. */
  const [waitingForPeerConnect, setWaitingForPeerConnect] = useState(false);

  const [findMatch, { isLoading: isStarting }] = useFindMatchMutation();
  const [cancelMatch] = useCancelMatchMutation();
  const [respondMatch] = useRespondMatchProposalMutation();
  const { socket } = useSocket();

  const requestIdRef = useRef<string | null>(null);
  /** Peer user id while proposal is open — `match:completed` uses initiator attemptId for both sockets. */
  const proposalPeerIdRef = useRef<string | null>(null);
  const findAMatchRef = useRef<() => Promise<void>>(async () => { });
  const statusRef = useRef<MatchStatus>('idle');
  const findTailRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const applies = useCallback(
    (attemptId: string) =>
      requestIdRef.current === attemptId || readStoredMatchAttemptId() === attemptId,
    [],
  );

  const applyProposedFromServer = useCallback(
    (
      requestId: string,
      peerUserId: string | undefined,
      matchScore?: number,
      isFallbackMatch?: boolean,
    ) => {
      if (peerUserId) proposalPeerIdRef.current = peerUserId;
      persistMatchAttemptId(requestIdRef, requestId);
      setStatus('proposed');
      setResult({ requestId, peerId: peerUserId, matchScore, isFallbackMatch });
      setError(null);
    },
    [],
  );

  const findAMatch = useCallback(() => {
    return runSerialized(findTailRef, async () => {
      try {
        setStatus('searching');
        setResult(null);
        setError(null);
        setWaitingForPeerConnect(false);

        const res = await findMatch().unwrap();
        const {
          requestId,
          status: engineStatus,
          reason,
          peerUserId,
          matchScore,
          isFallbackMatch
        } = res.data;

        if (engineStatus === 'no_match') {
          setStatus('error');
          setError(messageForFailedStart(reason));
          return;
        }

        persistMatchAttemptId(requestIdRef, requestId);

        if (engineStatus === 'proposed' && peerUserId) {
          proposalPeerIdRef.current = peerUserId;
          setStatus('proposed');
          setResult({
            requestId,
            peerId: peerUserId,
            matchScore,
            isFallbackMatch,
          });
        }
      } catch {
        setStatus('error');
        setError('Failed to start matchmaking');
      }
    });
  }, [findMatch]);

  findAMatchRef.current = findAMatch;

  useEffect(() => {
    const stored = readStoredMatchAttemptId();
    if (stored) {
      requestIdRef.current = stored;
      setStatus('searching');
    }
  }, []);

  useEffect(() => {
    const onMatchCompleted = (data: MatchCompletedPayload) => {
      const peerOk = proposalPeerIdRef.current != null && proposalPeerIdRef.current === data.peerId;
      if (!applies(data.attemptId) && !peerOk) return;
      proposalPeerIdRef.current = null;
      const requestId = requestIdRef.current ?? readStoredMatchAttemptId() ?? data.attemptId;
      clearMatchAttemptLocal(proposalPeerIdRef, requestIdRef);
      setWaitingForPeerConnect(false);
      setStatus('matched');
      setResult({
        requestId,
        roomId: data.roomId,
        peerId: data.peerId,
        matchScore: data.matchScore,
        isFallbackMatch: data.isFallbackMatch,
      });
    };

    const onMatchProposed = (data: MatchProposedPayload) => {
      const accept = applies(data.attemptId) || statusRef.current === 'searching';
      if (!accept) return;
      applyProposedFromServer(data.attemptId, data.peerId, data.matchScore, data.isFallbackMatch);
    };

    const onMatchState = (data: MatchStatePayload) => {
      if (data.status === 'searching' && data.requestId) {
        proposalPeerIdRef.current = null;
        persistMatchAttemptId(requestIdRef, data.requestId);
        setWaitingForPeerConnect(false);
        setStatus('searching');
      } else if (data.status === 'proposed' && data.requestId) {
        applyProposedFromServer(
          data.requestId,
          data.peerUserId,
          data.matchScore,
          data.isFallbackMatch,
        );
      } else if (data.status === 'matched' && data.roomId) {
        proposalPeerIdRef.current = null;
        const requestId = data.requestId ?? requestIdRef.current ?? '';
        clearMatchAttemptLocal(proposalPeerIdRef, requestIdRef);
        setWaitingForPeerConnect(false);
        setStatus('matched');
        setResult({ requestId, roomId: data.roomId });
      } else if (data.status === 'idle') {
        clearMatchAttemptLocal(proposalPeerIdRef, requestIdRef);
        setWaitingForPeerConnect(false);
        setStatus('idle');
        setResult(null);
      }
    };

    const onMatchNoMatch = (data: MatchNoMatchPayload) => {
      const stored = readStoredMatchAttemptId();
      if (stored === null) return;
      if (data.attemptId !== stored && requestIdRef.current !== data.attemptId) return;
      clearMatchAttemptLocal(proposalPeerIdRef, requestIdRef);
      setWaitingForPeerConnect(false);
      setStatus('error');
      setError(messageForNoMatch(data.reason));
    };

    const onProposalCancelled = (data: MatchProposalCancelledPayload) => {
      if (!applies(data.attemptId)) return;
      clearMatchAttemptLocal(proposalPeerIdRef, requestIdRef);
      setWaitingForPeerConnect(false);
      setResult(null);
      setError(null);

      if (data.reason === 'you_skipped' || data.reason === 'peer_skipped') {
        void findAMatchRef.current();
        return;
      }

      if (data.reason === 'cancelled_by_user') {
        setStatus('idle');
        return;
      }

      setStatus('error');
      setError(messageForProposalCancelled(data.reason));
    };

    socket.on('match:completed', onMatchCompleted);
    socket.on('match:proposed', onMatchProposed);
    socket.on('match:state', onMatchState);
    socket.on('match:no_match', onMatchNoMatch);
    socket.on('match:proposal_cancelled', onProposalCancelled);

    return () => {
      socket.off('match:completed', onMatchCompleted);
      socket.off('match:proposed', onMatchProposed);
      socket.off('match:state', onMatchState);
      socket.off('match:no_match', onMatchNoMatch);
      socket.off('match:proposal_cancelled', onProposalCancelled);
    };
  }, [socket, applies, applyProposedFromServer]);

  const cancelSearch = async () => {
    try {
      await cancelMatch().unwrap();
    } catch {
      // best-effort — clear local state regardless
    }
    clearMatchAttemptLocal(proposalPeerIdRef, requestIdRef);
    setWaitingForPeerConnect(false);
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  const respondToProposal = useCallback(
    async (decision: 'connect' | 'skip') => {
      const attemptId = requestIdRef.current ?? readStoredMatchAttemptId();
      if (!attemptId) {
        setError('No active match proposal.');
        return;
      }
      if (decision === 'skip') {
        setWaitingForPeerConnect(false);
      }
      try {
        setRespondBusy(true);
        await respondMatch({ attemptId, decision }).unwrap();
        if (decision === 'connect') {
          setWaitingForPeerConnect(true);
        }
      } catch {
        setError(decision === 'connect' ? 'Could not connect. Try again.' : 'Could not skip. Try again.');
        if (decision === 'connect') {
          setWaitingForPeerConnect(false);
        }
      } finally {
        setRespondBusy(false);
      }
    },
    [respondMatch],
  );

  return {
    findAMatch,
    cancelSearch,
    respondToProposal,
    status,
    result,
    error,
    isSearching: status === 'searching',
    isProposed: status === 'proposed',
    isLoading: isStarting || status === 'searching' || respondBusy,
    respondBusy,
    waitingForPeerConnect,
  };
}
