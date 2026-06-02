"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppShellLayout } from "./app-shell-layout";

/** Shared nav shell for main app routes (home, explore, messages, etc.). */
export function AppRouteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <AppShellLayout activePath={pathname}>{children}</AppShellLayout>;
}
