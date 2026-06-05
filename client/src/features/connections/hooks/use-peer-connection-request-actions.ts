"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  useRequestConnectionMutation,
  useWithdrawConnectionRequestMutation,
} from "@/features/connections/api/connections-api";

export type PeerConnectionRequestTarget = {
  userId: string;
  username: string;
};

type PendingOutgoing = {
  connectionId: string;
  status: "pending" | "accepted";
};

export function usePeerConnectionRequestActions() {
  const [requestConnection] = useRequestConnectionMutation();
  const [withdrawRequest] = useWithdrawConnectionRequestMutation();
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [withdrawingUserId, setWithdrawingUserId] = useState<string | null>(null);
  const [pendingOutgoingByUserId, setPendingOutgoingByUserId] = useState<
    Map<string, PendingOutgoing>
  >(() => new Map());

  const getOutgoing = useCallback(
    (userId: string) => pendingOutgoingByUserId.get(userId),
    [pendingOutgoingByUserId],
  );

  const setOutgoing = useCallback((userId: string, outgoing: PendingOutgoing) => {
    setPendingOutgoingByUserId((prev) => {
      const next = new Map(prev);
      next.set(userId, outgoing);
      return next;
    });
  }, []);

  const clearOutgoing = useCallback((userId: string) => {
    setPendingOutgoingByUserId((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const connect = useCallback(
    async (target: PeerConnectionRequestTarget) => {
      if (pendingOutgoingByUserId.has(target.userId)) return;

      setConnectingUserId(target.userId);
      try {
        const result = await requestConnection({
          targetUserId: target.userId,
          invalidatePublicProfileUsername: target.username,
        }).unwrap();

        const ok = result?.success === true && result.data?.status;
        if (!ok) {
          toast.error("Could not send connection request");
          return;
        }

        const connectionId = result.data?.connectionId;
        if (!connectionId) {
          toast.error("Could not send connection request");
          return;
        }

        setOutgoing(target.userId, {
          connectionId,
          status: result.data!.status as "pending" | "accepted",
        });
        toast.success("Connection request sent");
      } catch {
        toast.error("Could not send connection request");
      } finally {
        setConnectingUserId(null);
      }
    },
    [pendingOutgoingByUserId, requestConnection, setOutgoing],
  );

  const withdraw = useCallback(
    async (target: PeerConnectionRequestTarget, connectionId: string) => {
      setWithdrawingUserId(target.userId);
      try {
        await withdrawRequest({
          connectionId,
          peerUsername: target.username,
        }).unwrap();
        clearOutgoing(target.userId);
        toast.success("Request withdrawn");
      } catch {
        toast.error("Could not withdraw request");
      } finally {
        setWithdrawingUserId(null);
      }
    },
    [clearOutgoing, withdrawRequest],
  );

  return {
    getOutgoing,
    connect,
    withdraw,
    connectingUserId,
    withdrawingUserId,
  };
}
