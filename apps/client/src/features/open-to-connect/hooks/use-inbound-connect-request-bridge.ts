"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { useSocket } from "@/lib/socket";
import { queryKeys } from "@/lib/query/keys";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";
import { getApiErrorMessage, API_ENDPOINTS, apiFetch } from "@/lib/api";

import { useInboundConnectRequests } from "../api/connect-requests.queries";
import {
  connectRequestItemToIncoming,
  normalizeIncomingConnectRequest,
} from "../lib/incoming-connect-request.utils";
import type {
  IncomingConnectRequest,
  OtcRequestCancelledSocketPayload,
  OtcRequestReceivedSocketPayload,
  OtcRequestRespondedSocketPayload,
} from "../types/connect-requests.types";

/** React 19 — types may lag; runtime provides this hook. */
const useEffectEvent = React.useEffectEvent as <T extends (...args: never[]) => unknown>(fn: T) => T;

function dedupeQueue(items: IncomingConnectRequest[]): IncomingConnectRequest[] {
  const seen = new Set<string>();
  const next: IncomingConnectRequest[] = [];
  for (const item of items) {
    if (seen.has(item.requestId)) continue;
    seen.add(item.requestId);
    next.push(item);
  }
  return next;
}

function invalidateConnectRequestQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.openToConnect.inboundRequests });
  void qc.invalidateQueries({ queryKey: queryKeys.openToConnect.outboundRequests });
}

/**
 * Global socket listener for inbound Open to Connect requests.
 * Shows a modal app-wide (including mobile) when someone requests to connect.
 */
export function useInboundConnectRequestBridge() {
  const qc = useQueryClient();
  const { socket } = useSocket();
  const { data: inboundData } = useInboundConnectRequests();

  const [queue, setQueue] = useState<IncomingConnectRequest[]>([]);
  const [responding, setResponding] = useState(false);

  const incoming = queue[0] ?? null;

  const pendingFromQuery = useMemo(() => {
    return (inboundData?.items ?? []).map(connectRequestItemToIncoming);
  }, [inboundData?.items]);

  const enqueue = useEffectEvent((request: IncomingConnectRequest) => {
    setQueue((current) => dedupeQueue([...current, request]));
  });

  const removeFromQueue = useEffectEvent((requestId: string) => {
    setQueue((current) => current.filter((item) => item.requestId !== requestId));
  });

  const onRequestReceived = useEffectEvent((payload?: OtcRequestReceivedSocketPayload) => {
    if (!payload?.requestId) return;
    invalidateConnectRequestQueries(qc);
    enqueue(normalizeIncomingConnectRequest(payload));
  });

  const onRequestCancelled = useEffectEvent((payload?: OtcRequestCancelledSocketPayload) => {
    if (!payload?.requestId) return;
    invalidateConnectRequestQueries(qc);
    removeFromQueue(payload.requestId);
  });

  const onRequestResponded = useEffectEvent((payload?: OtcRequestRespondedSocketPayload) => {
    if (!payload?.requestId) return;
    invalidateConnectRequestQueries(qc);
    removeFromQueue(payload.requestId);
  });

  useEffect(() => {
    socket.on("otc:request_received", onRequestReceived);
    socket.on("otc:request_cancelled", onRequestCancelled);
    socket.on("otc:request_responded", onRequestResponded);
    return () => {
      socket.off("otc:request_received", onRequestReceived);
      socket.off("otc:request_cancelled", onRequestCancelled);
      socket.off("otc:request_responded", onRequestResponded);
    };
  }, [socket]);

  useEffect(() => {
    if (pendingFromQuery.length === 0) return;
    setQueue((current) => {
      const merged = dedupeQueue([...current, ...pendingFromQuery]);
      return merged.length === current.length ? current : merged;
    });
  }, [pendingFromQuery]);

  useEffect(() => {
    if (!incoming) return;
    const remaining = Math.max(0, new Date(incoming.expiresAt).getTime() - Date.now());
    const timer = window.setTimeout(() => {
      removeFromQueue(incoming.requestId);
      invalidateConnectRequestQueries(qc);
      toast.message(OPEN_TO_CONNECT.inbound.expired);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [incoming, qc]);

  const respond = async (accept: boolean) => {
    if (!incoming) return;
    setResponding(true);
    const requestId = incoming.requestId;
    try {
      await apiFetch<{ roomId: string | null }>(API_ENDPOINTS.CONNECT_REQUESTS.respond(requestId), {
        method: "POST",
        body: JSON.stringify({ accept }),
      });
      invalidateConnectRequestQueries(qc);
      removeFromQueue(requestId);
      if (!accept) {
        toast.message(OPEN_TO_CONNECT.toast.declined);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not respond to request"));
    } finally {
      setResponding(false);
    }
  };

  const handleAccept = () => void respond(true);
  const handleDecline = () => void respond(false);

  return {
    incoming,
    responding,
    handleAccept,
    handleDecline,
  };
}
