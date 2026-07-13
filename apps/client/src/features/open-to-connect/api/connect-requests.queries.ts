"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

import type { ConnectRequestListData } from "../types/connect-requests.types";

export function useInboundConnectRequests(enabled = true) {
  return useQuery({
    queryKey: queryKeys.openToConnect.inboundRequests,
    queryFn: () => apiFetch<ConnectRequestListData>(API_ENDPOINTS.CONNECT_REQUESTS.INBOUND),
    enabled,
    refetchInterval: 20_000,
  });
}

export function useOutboundConnectRequests(enabled = true) {
  return useQuery({
    queryKey: queryKeys.openToConnect.outboundRequests,
    queryFn: () => apiFetch<ConnectRequestListData>(API_ENDPOINTS.CONNECT_REQUESTS.OUTBOUND),
    enabled,
    refetchInterval: 20_000,
  });
}

export function usePendingOutboundByTargetUserId() {
  const { data } = useOutboundConnectRequests();
  const map = new Map<string, ConnectRequestListData["items"][number]>();
  for (const item of data?.items ?? []) {
    if (item.status === "pending") {
      map.set(item.peer.userId, item);
    }
  }
  return map;
}
