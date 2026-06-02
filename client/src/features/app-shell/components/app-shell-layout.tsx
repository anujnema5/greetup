"use client";

import type { ReactNode } from "react";

import { BottomNav, NavSidebar } from "./app-nav";

type AppShellLayoutProps = {
  activePath: string;
  children: ReactNode;
  /** Optional right rail (e.g. dashboard side panel). */
  aside?: ReactNode;
};

/**
 * Standard authenticated shell: sidebar, scrollable main, mobile bottom nav.
 * Room and landing routes intentionally omit this wrapper.
 */
export function AppShellLayout({
  activePath,
  children,
  aside,
}: AppShellLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath={activePath} />
      <div className="flex min-w-0 flex-1 overflow-hidden">{children}</div>
      {aside}
      <BottomNav activePath={activePath} />
    </div>
  );
}
