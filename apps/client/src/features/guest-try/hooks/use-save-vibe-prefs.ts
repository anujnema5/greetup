"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";

import { saveVibePrefs, type VibePrefsPayload } from "../api/guest-try.api";

export function useSaveVibePrefs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: VibePrefsPayload) => saveVibePrefs(body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.guestTry.status }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profileSetup.matchPrepCurrent }),
      ]);
    },
  });
}
