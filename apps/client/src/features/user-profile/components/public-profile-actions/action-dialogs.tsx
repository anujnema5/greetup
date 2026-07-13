"use client";

import { BlockUserDialog } from "@/features/blocks";
import { DisconnectConnectionDialog } from "@/features/connections/components/disconnect-connection-dialog";
import { WithdrawRequestDialog } from "@/features/connections/components/withdraw-request-dialog";
import type { PublicProfileConnectionPanel } from "@/features/user-profile/lib/public-profile-connection";
import type {
  PublicProfileConnectionHandlers,
  PublicProfilePeer,
} from "@/features/user-profile/types/public-profile-actions.types";

type DialogState = {
  disconnect: boolean;
  withdraw: boolean;
  block: boolean;
};

type PublicProfileActionDialogsProps = {
  panel: PublicProfileConnectionPanel;
  peer: PublicProfilePeer;
  connectionHandlers: PublicProfileConnectionHandlers;
  dialogState: DialogState;
  onDialogStateChange: (patch: Partial<DialogState>) => void;
  onBlockConfirm: () => void;
  isBlocking: boolean;
};

export function PublicProfileActionDialogs({
  panel,
  peer,
  connectionHandlers,
  dialogState,
  onDialogStateChange,
  onBlockConfirm,
  isBlocking,
}: PublicProfileActionDialogsProps) {
  const peerSummary = {
    name: peer.displayTitle,
    image: peer.primaryImage,
    username: peer.username,
  };

  return (
    <>
      {panel.kind === "accepted" ? (
        <DisconnectConnectionDialog
          open={dialogState.disconnect}
          onOpenChange={(open) => onDialogStateChange({ disconnect: open })}
          onConfirm={() => {
            void connectionHandlers.onDisconnect().then((ok) => {
              if (ok) onDialogStateChange({ disconnect: false });
            });
          }}
          isSubmitting={connectionHandlers.isSubmittingDisconnect}
          peer={peerSummary}
        />
      ) : null}

      {panel.kind === "pending_outgoing" ? (
        <WithdrawRequestDialog
          open={dialogState.withdraw}
          onOpenChange={(open) => onDialogStateChange({ withdraw: open })}
          onConfirm={() => {
            void connectionHandlers.onWithdraw().then((ok) => {
              if (ok) onDialogStateChange({ withdraw: false });
            });
          }}
          isSubmitting={connectionHandlers.isSubmittingWithdraw}
          peer={peerSummary}
        />
      ) : null}

      <BlockUserDialog
        open={dialogState.block}
        onOpenChange={(open) => onDialogStateChange({ block: open })}
        onConfirm={onBlockConfirm}
        isSubmitting={isBlocking}
        peer={peerSummary}
      />
    </>
  );
}

export type { DialogState as PublicProfileActionDialogState };
