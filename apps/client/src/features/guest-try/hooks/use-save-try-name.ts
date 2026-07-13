"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";

import { saveTryDisplayName } from "../api/guest-try.api";

export function useSaveTryName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (displayName: string) => saveTryDisplayName(displayName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.guestTry.status });
    },
  });
}
