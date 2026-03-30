"use client";

import { useEffect, useCallback, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { setCallReturnPath } from "@/features/call";
import { useFindMatch } from "@/features/matching/hooks/useFindMatch";

/**
 * Wires matchmaking to navigation (save return path, go to `/room/[id]`) and exposes stable handlers for the hero UI.
 * Navigation after a match runs inside `startTransition` so the UI stays responsive during the route change.
 */
export function useDashboardMatchFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const { findAMatch, cancelSearch, status, result, error } = useFindMatch();

  useEffect(() => {
    if (status !== "matched" || !result?.roomId) return;
    setCallReturnPath(pathname);
    const params = new URLSearchParams();
    if (result.peerId) params.set("peer", result.peerId);
    if (result.matchScore != null) params.set("score", String(Math.round(result.matchScore)));
    const url = `/room/${result.roomId}?${params.toString()}`;
    startTransition(() => {
      router.push(url);
    });
  }, [status, result, router, pathname, startTransition]);

  const handleFindMatch = useCallback(() => {
    if (status === "idle" || status === "error") findAMatch();
  }, [status, findAMatch]);

  const handleCancel = useCallback(() => {
    cancelSearch();
  }, [cancelSearch]);

  return {
    status,
    error,
    handleFindMatch,
    handleCancel,
  };
}
