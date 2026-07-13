"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GUEST_TRIAL_FLOW } from "@/lib/copy/user-messages";

import { TRY_SIGNUP_ROUTE } from "../constants/try-routes";
import { isTryAuthStatusError } from "../lib/try-auth-errors";
import { markTryConsumedLocally } from "../lib/try-navigation";
import { restartGuestSession } from "../lib/restart-guest-session";
import type { GuestTryStatus } from "../types/guest-try.types";
import { useCreateTrySession } from "./use-create-try-session";
import { useGuestTryStatus } from "./use-guest-try-status";
import { useTryAuthSettled } from "./use-try-auth-settled";

export type TryBootPhase =
  | { kind: "loading"; message: string }
  | { kind: "create-error"; error: unknown; onRetry: () => void }
  | { kind: "session-error"; onStartFresh: () => void }
  | { kind: "redirecting" }
  | { kind: "ready"; status: GuestTryStatus };

export function useTryBoot(): TryBootPhase {
  const router = useRouter();
  const staleSessionRecoveryRef = useRef(false);
  const [recoveringSession, setRecoveringSession] = useState(false);
  const { authSettled, hasAuthSession } = useTryAuthSettled();

  const createGuest = useCreateTrySession();
  const {
    mutate: createGuestSession,
    reset: resetGuestSession,
    isPending: createPending,
    isSuccess: createSucceeded,
    isError: createFailed,
    error: createError,
  } = createGuest;

  const guestSessionReady = hasAuthSession || createSucceeded;
  const {
    data: status,
    isLoading: statusLoading,
    isFetching: statusFetching,
    error: statusError,
    refetch: refetchStatus,
  } = useGuestTryStatus({ enabled: authSettled && guestSessionReady });

  const needsGuestSession =
    authSettled &&
    !hasAuthSession &&
    !createSucceeded &&
    !createPending &&
    !createFailed;

  const restartSession = useCallback(
    async (options?: { allowAutoRecoveryRetry?: boolean }) => {
      if (options?.allowAutoRecoveryRetry) {
        staleSessionRecoveryRef.current = false;
      }

      setRecoveringSession(true);
      try {
        await restartGuestSession({
          createGuestSession,
          refetchStatus,
          resetGuestSession,
        });
      } finally {
        setRecoveringSession(false);
      }
    },
    [createGuestSession, refetchStatus, resetGuestSession],
  );

  useEffect(() => {
    if (!needsGuestSession) {
      return;
    }

    createGuestSession(undefined, {
      onSuccess: () => {
        void refetchStatus();
      },
    });
  }, [needsGuestSession, createGuestSession, refetchStatus]);

  useEffect(() => {
    if (staleSessionRecoveryRef.current || !authSettled || !hasAuthSession) {
      return;
    }
    if (!isTryAuthStatusError(statusError) || statusLoading || statusFetching) {
      return;
    }

    staleSessionRecoveryRef.current = true;
    void restartSession();
  }, [
    authSettled,
    hasAuthSession,
    restartSession,
    statusError,
    statusFetching,
    statusLoading,
  ]);

  useEffect(() => {
    if (!status) {
      return;
    }

    if (!status.isGuest) {
      router.replace("/home");
      return;
    }

    if (status.trialConsumed) {
      markTryConsumedLocally();
      router.replace(TRY_SIGNUP_ROUTE);
    }
  }, [status, router]);

  const bootLoading = useMemo(() => {
    if (recoveringSession) {
      return true;
    }

    if (!authSettled) {
      return true;
    }

    if (createFailed || isTryAuthStatusError(statusError)) {
      return false;
    }

    if (!guestSessionReady) {
      return createPending || needsGuestSession;
    }

    return !status && (statusLoading || statusFetching);
  }, [
    authSettled,
    createFailed,
    createPending,
    guestSessionReady,
    needsGuestSession,
    recoveringSession,
    status,
    statusError,
    statusFetching,
    statusLoading,
  ]);

  const loadingMessage = !guestSessionReady
    ? GUEST_TRIAL_FLOW.loading.boot
    : GUEST_TRIAL_FLOW.loading.status;

  if (bootLoading) {
    return { kind: "loading", message: loadingMessage };
  }

  if (createFailed) {
    return {
      kind: "create-error",
      error: createError,
      onRetry: () => {
        resetGuestSession();
        createGuestSession();
      },
    };
  }

  if (isTryAuthStatusError(statusError)) {
    return {
      kind: "session-error",
      onStartFresh: () => {
        void restartSession({ allowAutoRecoveryRetry: true });
      },
    };
  }

  if (!status?.isGuest) {
    return { kind: "redirecting" };
  }

  return { kind: "ready", status };
}
