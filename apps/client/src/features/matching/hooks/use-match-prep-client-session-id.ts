"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "greetup_match_prep_client_session_id";

/**
 * Stable id for this browser tab session (`sessionStorage`). Used so match prep is shown once per tab
 * session and tracked server-side in `profile_match_prep_session`.
 */
export function useMatchPrepClientSessionId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let v = sessionStorage.getItem(STORAGE_KEY);
      if (!v) {
        v = crypto.randomUUID();
        sessionStorage.setItem(STORAGE_KEY, v);
      }
      queueMicrotask(() => setId(v));
    } catch {
      queueMicrotask(() => setId(crypto.randomUUID()));
    }
  }, []);

  return id;
}
