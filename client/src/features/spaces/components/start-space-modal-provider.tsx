"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { StartSpaceShellValue } from "@/features/spaces/hooks/use-start-space-modal-state";
import { useStartSpaceModalState } from "@/features/spaces/hooks/use-start-space-modal-state";
import { InviteFriendsDialog } from "./invite-friends-dialog";
import { StartSpaceModalDialog } from "./start-space-modal-dialog";

const StartSpaceShellContext = createContext<StartSpaceShellValue | null>(
  null,
);

export function useStartSpaceModal(): StartSpaceShellValue {
  const ctx = useContext(StartSpaceShellContext);
  if (!ctx) {
    throw new Error(
      "useStartSpaceModal must be used within StartSpaceModalProvider",
    );
  }
  return ctx;
}

/**
 * Owns Start a space + invite-friends flows. Wrap the dashboard (or any surface
 * that hosts triggers) and use {@link useStartSpaceModal} on orb/sidebar buttons.
 */
export function StartSpaceModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const state = useStartSpaceModalState();
  const { shell, inviteDialogOpen, handleInviteConfirm, ...dialogProps } = state;

  return (
    <StartSpaceShellContext.Provider value={shell}>
      {children}
      <StartSpaceModalDialog {...dialogProps} />
      <InviteFriendsDialog
        open={inviteDialogOpen}
        onOpenChange={state.setInviteDialogOpen}
        connections={state.connections}
        connectionsLoading={state.connectionsLoading}
        selectedIds={state.invitedPeerIds}
        onConfirm={handleInviteConfirm}
        maxSelectableInvites={state.maxInviteSlots}
        onAtCapacity={state.handleInviteAtCapacity}
      />
    </StartSpaceShellContext.Provider>
  );
}
