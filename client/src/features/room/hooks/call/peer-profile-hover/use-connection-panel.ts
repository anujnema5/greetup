"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAcceptConnectionMutation,
  useDisconnectConnectionMutation,
  useRejectConnectionMutation,
  useRequestConnectionMutation,
  useWithdrawConnectionRequestMutation,
} from "@/features/connections/api/connections-api";
import { applyPeerConnectionSync } from "@/features/connections/lib/realtime";
import { usePeerConnectionSync } from "@/features/connections/hooks/use-peer-connection-sync";
import {
  getPeerProfileConnectionPanel,
  isTerminalConnectionState,
  resolveHoverConnectionPanel,
  shouldClearPanelOverride,
} from "@/features/room/lib/call/peer-profile-hover";
import { connectionPatchFromRequestResult } from "@/features/room/lib/call/peer-profile-hover/connection-request-result";
import { publicProfileRtkCacheId } from "@/features/user-profile/api/public-profile-rtk-cache";
import type { PublicProfileConnectionPanel } from "@/features/user-profile/lib/public-profile-connection";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";
import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";
import { useAppDispatch } from "@/lib/redux/hooks";

const OPTIMISTIC_CONNECTION_ID = "__optimistic__";

type UsePeerProfileHoverConnectionPanelArgs = {
  peerUserId: string;
  username: string | null;
  connectionState: PublicProfileConnectionState;
  connectionId: string | null;
};

/** Connection CTAs + optimistic UI for the in-call hover card. */
export function usePeerProfileHoverConnectionPanel({
  peerUserId,
  username,
  connectionState,
  connectionId,
}: UsePeerProfileHoverConnectionPanelArgs) {
  const dispatch = useAppDispatch();
  const liveSync = usePeerConnectionSync(peerUserId);
  const [panelOverride, setPanelOverride] = useState<PublicProfileConnectionPanel | null>(null);

  const effectiveState = liveSync?.connectionState ?? connectionState;
  const effectiveConnectionId = liveSync?.connectionId ?? connectionId;

  const serverPanel = useMemo(
    () => getPeerProfileConnectionPanel(effectiveState, effectiveConnectionId),
    [effectiveState, effectiveConnectionId],
  );

  const panel = useMemo(
    () =>
      resolveHoverConnectionPanel({
        panelOverride,
        serverPanel,
        effectiveState,
      }),
    [effectiveState, panelOverride, serverPanel],
  );

  useEffect(() => {
    if (!panelOverride) return;
    if (
      shouldClearPanelOverride({
        panelOverride,
        serverPanel,
        effectiveState,
        liveSyncIsTerminal: Boolean(
          liveSync && isTerminalConnectionState(liveSync.connectionState),
        ),
      })
    ) {
      setPanelOverride(null);
    }
  }, [effectiveState, liveSync, panelOverride, serverPanel]);

  const applyConnectionPatch = useCallback(
    (patch: { connectionState: PublicProfileConnectionState; connectionId: string | null }) => {
      setPanelOverride(getPeerProfileConnectionPanel(patch.connectionState, patch.connectionId));
      applyPeerConnectionSync(dispatch, peerUserId, patch);
    },
    [dispatch, peerUserId],
  );

  const [requestConnection, { isLoading: isConnecting }] = useRequestConnectionMutation();
  const [acceptConnection, { isLoading: isAccepting }] = useAcceptConnectionMutation();
  const [rejectConnection, { isLoading: isRejecting }] = useRejectConnectionMutation();
  const [disconnectConnection, { isLoading: isDisconnecting }] =
    useDisconnectConnectionMutation();
  const [withdrawConnectionRequest, { isLoading: isWithdrawing }] =
    useWithdrawConnectionRequestMutation();

  const peerUsername = username?.trim() || null;
  const invalidateUsername = peerUsername ? publicProfileRtkCacheId(peerUsername) : undefined;

  const onConnect = useCallback(() => {
    setPanelOverride({
      kind: "pending_outgoing",
      connectionId: OPTIMISTIC_CONNECTION_ID,
    });

    void requestConnection({
      targetUserId: peerUserId,
      invalidatePublicProfileUsername: invalidateUsername,
    })
      .unwrap()
      .then((result) => {
        const patch = connectionPatchFromRequestResult(result);
        applyConnectionPatch(patch);
        toast.success(
          patch.connectionState === "accepted"
            ? "You're now connected"
            : "Connection request sent",
        );
      })
      .catch((e: unknown) => {
        setPanelOverride(null);
        toast.error(getRtkQueryErrorMessage(e));
      });
  }, [applyConnectionPatch, invalidateUsername, peerUserId, requestConnection]);

  const onAccept = useCallback(() => {
    if (panel.kind !== "pending_incoming") return;
    const { connectionId: id } = panel;
    applyConnectionPatch({ connectionState: "accepted", connectionId: id });

    void acceptConnection({ connectionId: id, peerUsername, peerUserId })
      .unwrap()
      .then(() => toast.success("Connection accepted"))
      .catch((e: unknown) => {
        setPanelOverride(null);
        toast.error(getRtkQueryErrorMessage(e));
      });
  }, [acceptConnection, applyConnectionPatch, panel, peerUserId, peerUsername]);

  const onReject = useCallback(() => {
    if (panel.kind !== "pending_incoming") return;
    const { connectionId: id } = panel;
    applyConnectionPatch({ connectionState: "none", connectionId: null });

    void rejectConnection({ connectionId: id, peerUsername, peerUserId })
      .unwrap()
      .then(() => toast.success("Request declined"))
      .catch((e: unknown) => {
        setPanelOverride(null);
        toast.error(getRtkQueryErrorMessage(e));
      });
  }, [applyConnectionPatch, panel, peerUserId, peerUsername, rejectConnection]);

  const onWithdraw = useCallback(() => {
    if (panel.kind !== "pending_outgoing") return;
    const id = panel.connectionId;
    if (id === OPTIMISTIC_CONNECTION_ID) return;

    applyConnectionPatch({ connectionState: "none", connectionId: null });

    void withdrawConnectionRequest({ connectionId: id, peerUsername, peerUserId })
      .unwrap()
      .then(() => toast.success("Request withdrawn"))
      .catch((e: unknown) => {
        setPanelOverride(null);
        toast.error(getRtkQueryErrorMessage(e));
      });
  }, [applyConnectionPatch, panel, peerUserId, peerUsername, withdrawConnectionRequest]);

  const onDisconnect = useCallback(() => {
    if (panel.kind !== "accepted") return;
    const { connectionId: id } = panel;
    applyConnectionPatch({ connectionState: "none", connectionId: null });

    void disconnectConnection({ connectionId: id, peerUsername, peerUserId })
      .unwrap()
      .then(() => toast.success("Connection removed"))
      .catch((e: unknown) => {
        setPanelOverride(null);
        toast.error(getRtkQueryErrorMessage(e));
      });
  }, [applyConnectionPatch, disconnectConnection, panel, peerUserId, peerUsername]);

  const isPendingOptimistic =
    panel.kind === "pending_outgoing" && panel.connectionId === OPTIMISTIC_CONNECTION_ID;

  return {
    panel,
    onConnect,
    onAccept,
    onReject,
    onWithdraw,
    onDisconnect,
    isConnecting: isConnecting || isPendingOptimistic,
    isAccepting,
    isRejecting,
    isWithdrawing,
    isDisconnecting,
    isPendingOptimistic,
  };
}
