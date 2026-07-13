"use client";

import { NavSidebar, BottomNav } from "@/features/app-shell";

import { SpacesBrowseView } from "../components/browse";
import { StartSpaceModalProvider } from "../components/start-space-modal-provider";
import { SPACES_BROWSE_PATH } from "../lib/spaces-browse-path";

/** `/spaces` — full browse for invited, joined, and public spaces. */
export function SpacesPage() {
  return (
    <StartSpaceModalProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <NavSidebar activePath={SPACES_BROWSE_PATH} />

        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <SpacesBrowseView />
        </main>

        <BottomNav activePath={SPACES_BROWSE_PATH} />
      </div>
    </StartSpaceModalProvider>
  );
}
