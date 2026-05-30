"use client";

import { useCallback, useMemo, useState } from "react";

import { useBlockUserAction } from "@/features/blocks";
import { cn } from "@/lib/utils";

import { usePublicProfileCallEligibility } from "../../hooks/use-public-profile-call-eligibility";
import { usePublicProfileInteractions } from "../../hooks/use-public-profile-interactions";
import type { PublicProfileActionsProps } from "../../types/public-profile-actions.types";

import {
  PublicProfileActionDialogs,
  type PublicProfileActionDialogState,
} from "./action-dialogs";
import { PublicProfileConnectPanel } from "./connect-panel";
import { PublicProfileConnectedPanel } from "./connected-panel";
import { PublicProfilePendingIncomingPanel } from "./pending-incoming-panel";
import { PublicProfilePendingOutgoingPanel } from "./pending-outgoing-panel";
import { PublicProfileViewerPanel } from "./viewer-panel";

const INITIAL_DIALOG_STATE: PublicProfileActionDialogState = {
  disconnect: false,
  withdraw: false,
  block: false,
};

export function PublicProfileActions({
  panel,
  peer,
  isViewer,
  connectionHandlers,
  className,
}: PublicProfileActionsProps) {
  const [dialogs, setDialogs] = useState(INITIAL_DIALOG_STATE);

  const isConnected = panel.kind === "accepted";

  const { canCall, disabledReason: callDisabledReason, statusLoading } =
    usePublicProfileCallEligibility({
      peerUserId: peer.userId,
      enabled: isConnected,
    });

  const {
    openConversation,
    startProfileCall,
    copyProfileLink,
    isOpeningChat,
    isStartingCall,
  } = usePublicProfileInteractions({
    peer,
    messagingEnabled: isConnected,
  });

  const { block, isBlocking } = useBlockUserAction(peer);

  const patchDialogs = useCallback((patch: Partial<PublicProfileActionDialogState>) => {
    setDialogs((current) => ({ ...current, ...patch }));
  }, []);

  const handleBlockConfirm = useCallback(() => {
    void block().then((ok) => {
      if (ok) patchDialogs({ block: false });
    });
  }, [block, patchDialogs]);

  const overflowMenu = useMemo(
    () => ({
      onCopyLink: () => void copyProfileLink(),
      onBlock: () => patchDialogs({ block: true }),
      ...(isConnected
        ? { onRemoveConnection: () => patchDialogs({ disconnect: true }) }
        : {}),
      ...(panel.kind === "pending_outgoing"
        ? { onWithdrawRequest: () => patchDialogs({ withdraw: true }) }
        : {}),
    }),
    [copyProfileLink, isConnected, panel.kind, patchDialogs],
  );

  const dialogLayer = (
    <PublicProfileActionDialogs
      panel={panel}
      peer={peer}
      connectionHandlers={connectionHandlers}
      dialogState={dialogs}
      onDialogStateChange={patchDialogs}
      onBlockConfirm={handleBlockConfirm}
      isBlocking={isBlocking}
    />
  );

  if (isViewer) {
    return (
      <PublicProfileViewerPanel
        className={className}
        onCopyLink={() => void copyProfileLink()}
      />
    );
  }

  if (panel.kind === "none") {
    return null;
  }

  if (panel.kind === "connect") {
    return (
      <div className={cn("w-full", className)}>
        <PublicProfileConnectPanel
          connectionHandlers={connectionHandlers}
          overflow={overflowMenu}
        />
        {dialogLayer}
      </div>
    );
  }

  if (panel.kind === "pending_incoming") {
    return (
      <div className={cn("w-full", className)}>
        <PublicProfilePendingIncomingPanel
          connectionHandlers={connectionHandlers}
          overflow={overflowMenu}
        />
        {dialogLayer}
      </div>
    );
  }

  if (panel.kind === "pending_outgoing") {
    return (
      <div className={cn("w-full", className)}>
        <PublicProfilePendingOutgoingPanel
          connectionHandlers={connectionHandlers}
          overflow={overflowMenu}
          onWithdrawClick={() => patchDialogs({ withdraw: true })}
        />
        {dialogLayer}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <PublicProfileConnectedPanel
        onMessage={() => void openConversation()}
        onCall={(mode) => void startProfileCall(mode)}
        canCall={canCall}
        callDisabledReason={callDisabledReason}
        callStatusLoading={statusLoading}
        isOpeningChat={isOpeningChat}
        isStartingCall={isStartingCall}
        overflow={overflowMenu}
      />
      {dialogLayer}
    </div>
  );
}
