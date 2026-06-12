"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

import { fetchGuestTryStatus } from "../api/guest-try.api";
import type { GuestTryStatus } from "../types/guest-try.types";

type UseGuestTryStatusOptions = {
  enabled?: boolean;
};

export function useGuestTryStatus(options?: UseGuestTryStatusOptions) {
  return useQuery({
    queryKey: queryKeys.guestTry.status,
    queryFn: fetchGuestTryStatus,
    enabled: options?.enabled ?? true,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 30_000,
  });
}

export type { GuestTryStatus };
