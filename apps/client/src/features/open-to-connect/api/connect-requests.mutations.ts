"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_ENDPOINTS, apiFetch, getApiErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import { toast } from "sonner";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";

import type { ConnectRequestItem } from "../types/connect-requests.types";

function invalidateConnectRequestQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.openToConnect.inboundRequests });
  void qc.invalidateQueries({ queryKey: queryKeys.openToConnect.outboundRequests });
}

export function useCreateConnectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { targetUserId: string; message?: string | null }) => {
      return apiFetch<ConnectRequestItem>(API_ENDPOINTS.CONNECT_REQUESTS.CREATE, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      invalidateConnectRequestQueries(qc);
      toast.success(OPEN_TO_CONNECT.toast.requestSent);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, OPEN_TO_CONNECT.toast.requestFailed));
    },
  });
}

export function useCancelConnectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      await apiFetch(API_ENDPOINTS.CONNECT_REQUESTS.cancel(requestId), { method: "POST" });
    },
    onSuccess: () => {
      invalidateConnectRequestQueries(qc);
    },
  });
}

export function useRespondConnectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      return apiFetch<{ roomId: string | null }>(API_ENDPOINTS.CONNECT_REQUESTS.respond(requestId), {
        method: "POST",
        body: JSON.stringify({ accept }),
      });
    },
    onSuccess: (_data, variables) => {
      invalidateConnectRequestQueries(qc);
      if (variables.accept) {
        toast.success(OPEN_TO_CONNECT.toast.accepted);
      }
    },
  });
}
