"use client";

import { QueryProvider } from "@/lib/query/provider";

/** Lightweight data layer for auth, onboarding, and marketing pages. */
export function QueryProviderShell({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
