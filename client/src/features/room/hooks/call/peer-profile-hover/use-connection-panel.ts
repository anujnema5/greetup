"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAcceptConnection,
  useDisconnectConnection,
  useRejectConnection,
  useRequestConnection,
  useWithdrawConnectionRequest,
} from "@/features/connections/api/connections.mutations";
import { applyPeerConnectionSync } from "@/features/connections/lib/realtime";
import { usePeerConnectionSync } from "@/features/connections/hooks/use-peer-connection-sync";
import {
  getPeerProfileConnectionPanel,
  isTerminalConnectionState,
  resolveHoverConnectionPanel,
  shouldClearPanelOverride,
} from "@/features/room/lib/call/peer-profile-hover";
import { connectionPatchFromRequestResult } from "@/features/room/lib/call/peer-profile-hover/connection-request-result";
import { publicProfileCacheId } from "@/features/user-profile/api/public-profile-cache-id";
import type { PublicProfileConnectionPanel } from "@/features/user-profile/lib/public-profile-connection";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";
import { getApiErrorMessage } from "@/lib/api/fetch-client";

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
      applyPeerConnectionSync(peerUserId, patch);
    },
    [peerUserId],
  );

  const { mutateAsync: requestConnection, isPending: isConnecting } = useRequestConnection();
  const { mutateAsync: acceptConnection, isPending: isAccepting } = useAcceptConnection();
  const { mutateAsync: rejectConnection, isPending: isRejecting } = useRejectConnection();
  const { mutateAsync: disconnectConnection, isPending: isDisconnecting } =
    useDisconnectConnection();
  const { mutateAsync: withdrawConnectionRequest, isPending: isWithdrawing } =
    useWithdrawConnectionRequest();

  const peerUsername = username?.trim() || null;
  const invalidateUsername = peerUsername ? publicProfileCacheId(peerUsername) : undefined;

  const onConnect = useCallback(() => {
    setPanelOverride({
      kind: "pending_outgoing",
      connectionId: OPTIMISTIC_CONNECTION_ID,
    });

    void requestConnection({
      targetUserId: peerUserId,
      invalidatePublicProfileUsername: invalidateUsername,
    })
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
        toast.error(getApiErrorMessage(e, "Could not connect"));
      });
  }, [applyConnectionPatch, invalidateUsername, peerUserId, requestConnection]);

  const onAccept = useCallback(() => {
    if (panel.kind !== "pending_incoming") return;
    const { connectionId: id } = panel;
    applyConnectionPatch({ connectionState: "accepted", connectionId: id });

    void acceptConnection({ connectionId: id, peerUsername, peerUserId })
      .then(() => toast.success("Connection accepted"))
      .catch((e: unknown) => {
        setPanelOverride(null);
        toast.error(getApiErrorMessage(e, "Could not accept"));
      });
  }, [acceptConnection, applyConnectionPatch, panel, peerUserId, peerUsername]);

  const onReject = useCallback(() => {
    if (panel.kind !== "pending_incoming") return;
    const { connectionId: id } = panel;
    applyConnectionPatch({ connectionState: "none", connectionId: null });

    void rejectConnection({ connectionId: id, peerUsername, peerUserId })
      .then(() => toast.success("Request declined"))
      .catch((e: unknown) => {
        setPanelOverride(null);
        toast.error(getApiErrorMessage(e, "Could not decline"));
      });
  }, [applyConnectionPatch, panel, peerUserId, peerUsername, rejectConnection]);

  const onWithdraw = useCallback(() => {
    if (panel.kind !== "pending_outgoing") return;
    const id = panel.connectionId;
    if (id === OPTIMISTIC_CONNECTION_ID) return;

    applyConnectionPatch({ connectionState: "none", connectionId: null });

    void withdrawConnectionRequest({ connectionId: id, peerUsername, peerUserId })
      .then(() => toast.success("Request withdrawn"))
      .catch((e: unknown) => {
        setPanelOverride(null);
        toast.error(getApiErrorMessage(e, "Could not withdraw"));
      });
  }, [applyConnectionPatch, panel, peerUserId, peerUsername, withdrawConnectionRequest]);

  const onDisconnect = useCallback(() => {
    if (panel.kind !== "accepted") return;
    const { connectionId: id } = panel;
    applyConnectionPatch({ connectionState: "none", connectionId: null });

    void disconnectConnection({ connectionId: id, peerUsername, peerUserId })
      .then(() => toast.success("Connection removed"))
      .catch((e: unknown) => {
        setPanelOverride(null);
        toast.error(getApiErrorMessage(e, "Could not disconnect"));
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
