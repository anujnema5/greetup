"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_ENDPOINTS, apiFetch, getApiErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";
import { toast } from "sonner";

import type { OpenToConnectMe } from "../types/open-to-connect.types";

export type EnableOpenToConnectInput = {
  headline?: string | null;
  activitySelections?: { activityId: string; detail?: string | null }[];
  source?: "manual" | "post_no_match";
};

function invalidateOpenToConnectQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.openToConnect.all });
}

export function useEnableOpenToConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: EnableOpenToConnectInput) => {
      return apiFetch<OpenToConnectMe>(API_ENDPOINTS.OPEN_TO_CONNECT.ENABLE, {
        method: "POST",
        body: JSON.stringify({ source: "manual", ...body }),
      });
    },
    onSuccess: () => {
      invalidateOpenToConnectQueries(qc);
      toast.success(OPEN_TO_CONNECT.toast.enabled);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, OPEN_TO_CONNECT.toast.enableFailed));
    },
  });
}

export function useDisableOpenToConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return apiFetch<OpenToConnectMe>(API_ENDPOINTS.OPEN_TO_CONNECT.DISABLE, {
        method: "POST",
      });
    },
    onSuccess: () => {
      invalidateOpenToConnectQueries(qc);
      toast.success(OPEN_TO_CONNECT.toast.disabled);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, OPEN_TO_CONNECT.toast.disableFailed));
    },
  });
}
