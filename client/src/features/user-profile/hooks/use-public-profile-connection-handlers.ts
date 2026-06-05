"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import {
  useAcceptConnectionMutation,
  useDisconnectConnectionMutation,
  useRejectConnectionMutation,
  useRequestConnectionMutation,
  useWithdrawConnectionRequestMutation,
} from "@/features/connections/api/connections-api";
import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";

import { publicProfileRtkCacheId } from "../api/public-profile-rtk-cache";
import type { PublicProfileConnectionPanel } from "../lib/public-profile-connection";
import type {
  PublicProfileConnectionHandlers,
} from "../types/public-profile-actions.types";
import type { PublicProfileData } from "../types/public-profile.types";

export function usePublicProfileConnectionHandlers(
  profile: PublicProfileData | undefined,
  panel: PublicProfileConnectionPanel | null,
): PublicProfileConnectionHandlers {
  const [requestConnection, { isLoading: isSubmittingConnect }] =
    useRequestConnectionMutation();
  const [acceptConnection, { isLoading: isSubmittingAccept }] =
    useAcceptConnectionMutation();
  const [rejectConnection, { isLoading: isSubmittingReject }] =
    useRejectConnectionMutation();
  const [disconnectConnection, { isLoading: isSubmittingDisconnect }] =
    useDisconnectConnectionMutation();
  const [withdrawConnectionRequest, { isLoading: isSubmittingWithdraw }] =
    useWithdrawConnectionRequestMutation();

  return useMemo(
    () => ({
      onConnect: () => {
        if (!profile) return;
        void requestConnection({
          targetUserId: profile.userId,
          invalidatePublicProfileUsername: publicProfileRtkCacheId(profile.username),
        })
          .unwrap()
          .then(() => toast.success("Connection request sent"))
          .catch((error: unknown) => toast.error(getRtkQueryErrorMessage(error)));
      },

      onDisconnect: async (): Promise<boolean> => {
        if (!profile || !panel || panel.kind !== "accepted") return false;
        try {
          await disconnectConnection({
            connectionId: panel.connectionId,
            peerUsername: profile.username,
          }).unwrap();
          toast.success("Connection removed");
          return true;
        } catch (error: unknown) {
          toast.error(getRtkQueryErrorMessage(error));
          return false;
        }
      },

      onWithdraw: async (): Promise<boolean> => {
        if (!profile || !panel || panel.kind !== "pending_outgoing") return false;
        try {
          await withdrawConnectionRequest({
            connectionId: panel.connectionId,
            peerUsername: profile.username,
          }).unwrap();
          toast.success("Request withdrawn");
          return true;
        } catch (error: unknown) {
          toast.error(getRtkQueryErrorMessage(error));
          return false;
        }
      },

      onAccept: () => {
        if (!profile || !panel || panel.kind !== "pending_incoming") return;
        void acceptConnection({
          connectionId: panel.connectionId,
          peerUsername: profile.username,
        })
          .unwrap()
          .then(() => toast.success("Connection accepted"))
          .catch((error: unknown) => toast.error(getRtkQueryErrorMessage(error)));
      },

      onReject: () => {
        if (!profile || !panel || panel.kind !== "pending_incoming") return;
        void rejectConnection({
          connectionId: panel.connectionId,
          peerUsername: profile.username,
        })
          .unwrap()
          .then(() => toast.success("Request rejected"))
          .catch((error: unknown) => toast.error(getRtkQueryErrorMessage(error)));
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
