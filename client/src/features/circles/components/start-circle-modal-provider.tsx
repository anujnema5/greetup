"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { StartCircleShellValue } from "@/features/circles/hooks/use-start-circle-modal-state";
import { useStartCircleModalState } from "@/features/circles/hooks/use-start-circle-modal-state";
import { InviteFriendsDialog } from "./invite-friends-dialog";
import { StartCircleModalDialog } from "./start-circle-modal-dialog";

const StartCircleShellContext = createContext<StartCircleShellValue | null>(
  null,
);

export function useStartCircleModal(): StartCircleShellValue {
  const ctx = useContext(StartCircleShellContext);
  if (!ctx) {
    throw new Error(
      "useStartCircleModal must be used within StartCircleModalProvider",
    );
  }
  return ctx;
}

/**
 * Owns Start a circle + invite-friends flows. Wrap the dashboard (or any surface
 * that hosts triggers) and use {@link useStartCircleModal} on orb/sidebar buttons.
 */
export function StartCircleModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const state = useStartCircleModalState();
  const { shell, inviteDialogOpen, handleInviteConfirm, ...dialogProps } = state;

  return (
    <StartCircleShellContext.Provider value={shell}>
      {children}
      <StartCircleModalDialog {...dialogProps} />
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
    </StartCircleShellContext.Provider>
  );
}
