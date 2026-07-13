"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  buildConnectionsPath,
  connectionsProfileFromSearchParams,
} from "../lib/connections-profile-query";

export function useConnectionsProfilePanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedUsername = connectionsProfileFromSearchParams(searchParams);
  const panelOpen = selectedUsername != null;

  const setSelectedUsername = useCallback(
    (username: string | null) => {
      const next = buildConnectionsPath(pathname, new URLSearchParams(searchParams.toString()), username);
      router.replace(next, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openProfile = useCallback(
    (username: string) => {
      const slug = username.trim();
      if (!slug) return;
      setSelectedUsername(slug);
    },
    [setSelectedUsername],
  );

  const closeProfile = useCallback(() => {
    setSelectedUsername(null);
  }, [setSelectedUsername]);

  return {
    selectedUsername,
    panelOpen,
    openProfile,
    closeProfile,
  };
}
