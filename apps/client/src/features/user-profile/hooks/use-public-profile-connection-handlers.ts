"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import {
  useAcceptConnection,
  useDisconnectConnection,
  useRejectConnection,
  useRequestConnection,
  useWithdrawConnectionRequest,
} from "@/features/connections/api/connections.mutations";
import { getApiErrorMessage } from "@/lib/api/fetch-client";

import { publicProfileCacheId } from "../api/public-profile-cache-id";
import type { PublicProfileConnectionPanel } from "../lib/public-profile-connection";
import type {
  PublicProfileConnectionHandlers,
} from "../types/public-profile-actions.types";
import type { PublicProfileData } from "../types/public-profile.types";

export function usePublicProfileConnectionHandlers(
  profile: PublicProfileData | undefined,
  panel: PublicProfileConnectionPanel | null,
): PublicProfileConnectionHandlers {
  const { mutateAsync: requestConnection, isPending: isSubmittingConnect } =
    useRequestConnection();
  const { mutateAsync: acceptConnection, isPending: isSubmittingAccept } =
    useAcceptConnection();
  const { mutateAsync: rejectConnection, isPending: isSubmittingReject } =
    useRejectConnection();
  const { mutateAsync: disconnectConnection, isPending: isSubmittingDisconnect } =
    useDisconnectConnection();
  const { mutateAsync: withdrawConnectionRequest, isPending: isSubmittingWithdraw } =
    useWithdrawConnectionRequest();

  return useMemo(
    () => ({
      onConnect: () => {
        if (!profile) return;
        void requestConnection({
          targetUserId: profile.userId,
          invalidatePublicProfileUsername: publicProfileCacheId(profile.username),
        })
          .then(() => toast.success("Connection request sent"))
          .catch((error: unknown) => toast.error(getApiErrorMessage(error, "Request failed")));
      },

      onDisconnect: async (): Promise<boolean> => {
        if (!profile || !panel || panel.kind !== "accepted") return false;
        try {
          await disconnectConnection({
            connectionId: panel.connectionId,
            peerUsername: profile.username,
          });
          toast.success("Connection removed");
          return true;
        } catch (error: unknown) {
          toast.error(getApiErrorMessage(error, "Could not disconnect"));
          return false;
        }
      },

      onWithdraw: async (): Promise<boolean> => {
        if (!profile || !panel || panel.kind !== "pending_outgoing") return false;
        try {
          await withdrawConnectionRequest({
            connectionId: panel.connectionId,
            peerUsername: profile.username,
          });
          toast.success("Request withdrawn");
          return true;
        } catch (error: unknown) {
          toast.error(getApiErrorMessage(error, "Could not withdraw request"));
          return false;
        }
      },

      onAccept: () => {
        if (!profile || !panel || panel.kind !== "pending_incoming") return;
        void acceptConnection({
          connectionId: panel.connectionId,
          peerUsername: profile.username,
        })
          .then(() => toast.success("Connection accepted"))
          .catch((error: unknown) => toast.error(getApiErrorMessage(error, "Could not accept")));
      },

      onReject: () => {
        if (!profile || !panel || panel.kind !== "pending_incoming") return;
        void rejectConnection({
          connectionId: panel.connectionId,
          peerUsername: profile.username,
        })
          .then(() => toast.success("Request rejected"))
          .catch((error: unknown) => toast.error(getApiErrorMessage(error, "Could not reject")));
      },

      isSubmittingConnect,
      isSubmittingDisconnect,
      isSubmittingWithdraw,
      isSubmittingAccept,
      isSubmittingReject,
    }),
    [
      acceptConnection,
      disconnectConnection,
      panel,
      profile,
      rejectConnection,
      requestConnection,
      withdrawConnectionRequest,
      isSubmittingAccept,
      isSubmittingConnect,
      isSubmittingDisconnect,
      isSubmittingReject,
      isSubmittingWithdraw,
    ],
  );
}
