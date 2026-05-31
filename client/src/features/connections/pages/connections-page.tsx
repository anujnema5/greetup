"use client";

import { NavSidebar, BottomNav, PageHeader } from "@/features/app-shell";

import { ProfileConnectionsSection } from "../components/profile-connections-section";

export function ConnectionsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/connections" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <PageHeader
          title="Connections"
          subtitle="People you're connected with and pending requests."
        />

        <div className="flex flex-col gap-5 px-4 md:px-8 py-5 max-w-lg md:max-w-xl mx-auto w-full min-w-0">
          <ProfileConnectionsSection variant="page" />
        </div>
      </main>

      <BottomNav activePath="/connections" />
    </div>
  );
}
