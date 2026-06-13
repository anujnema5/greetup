"use client";

import { useEffect, useMemo, useState } from "react";

import { authClient, useSession } from "@/lib/auth-client";

import { TRY_SESSION_BOOT_TIMEOUT_MS } from "../constants/try-boot.constants";

/**
 * Resolves Better Auth session on client navigation. `useSession()` can stay
 * pending after a soft route change; we nudge it with `getSession()` and fall
 * back to an unauthenticated boot path after a short timeout.
 */
export function useTryAuthSettled() {
  const { data: session, isPending: sessionPending } = useSession();
  const [sessionBootTimedOut, setSessionBootTimedOut] = useState(false);

  useEffect(() => {
    void authClient.getSession();
  }, []);

  useEffect(() => {
    if (!sessionPending) {
      setSessionBootTimedOut(false);
      return;
    }

    const timer = window.setTimeout(
      () => setSessionBootTimedOut(true),
      TRY_SESSION_BOOT_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [sessionPending]);

  const authSettled = !sessionPending || sessionBootTimedOut;

  const hasAuthSession = useMemo(() => {
    if (sessionPending && sessionBootTimedOut) {
      return false;
    }
    return Boolean(session?.user);
  }, [session?.user, sessionPending, sessionBootTimedOut]);

  return { authSettled, hasAuthSession };
}
