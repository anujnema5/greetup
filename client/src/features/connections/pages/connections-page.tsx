"use client";

import { NavSidebar, BottomNav } from "@/features/app-shell";

import { ProfileConnectionsSection } from "../components/profile-connections-section";

export function ConnectionsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/connections" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background/95 backdrop-blur-md shadow-sm">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-none">Connections</h1>
            <p className="text-[11px] text-muted-foreground mt-1">
              People you&apos;re connected with and pending requests.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-5 px-4 md:px-8 py-5 max-w-lg md:max-w-xl mx-auto w-full min-w-0">
          <ProfileConnectionsSection variant="page" />
        </div>
      </main>

      <BottomNav activePath="/connections" />
    </div>
  );
}
