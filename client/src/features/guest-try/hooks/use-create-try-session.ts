"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getApiErrorCode, getApiErrorMessage, getGuestTryApiErrorAction } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query/keys";

import { createTrySession } from "../api/guest-try.api";

export function useCreateTrySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTrySession,
    onSuccess: async () => {
      await authClient.getSession();
      await queryClient.invalidateQueries({ queryKey: queryKeys.guestTry.status });
    },
  });
}

export function getTrySessionErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, "Could not get started");
}

export function isTrySignupRequiredError(error: unknown): boolean {
  return getGuestTryApiErrorAction(getApiErrorCode(error)) === "signup";
}
