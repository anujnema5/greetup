"use client";

import { useEffect, useState } from "react";

/** Avoid hydration mismatches for client-only display (avatars, greetings). */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
