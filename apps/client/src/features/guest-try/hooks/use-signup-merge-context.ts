"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";

import { fetchSignupMergeContext } from "../api/guest-try.api";

type UseSignupMergeContextOptions = {
  enabled?: boolean;
  fromGuest?: boolean;
};

export function useSignupMergeContext(options?: UseSignupMergeContextOptions) {
  const fromGuest = options?.fromGuest ?? true;

  return useQuery({
    queryKey: [...queryKeys.guestTry.signupContext, fromGuest] as const,
    queryFn: () => fetchSignupMergeContext(fromGuest),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}
