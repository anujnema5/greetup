"use client";

import { NavSidebar, BottomNav } from "@/features/app-shell";

import { CirclesBrowseView } from "../components/browse";
import { StartCircleModalProvider } from "../components/start-circle-modal-provider";
import { CIRCLES_BROWSE_PATH } from "../lib/circles-browse-path";

/** `/circles` — full browse for invited, joined, and public circles. */
export function CirclesPage() {
  return (
    <StartCircleModalProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <NavSidebar activePath={CIRCLES_BROWSE_PATH} />

        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <CirclesBrowseView />
        </main>

        <BottomNav activePath={CIRCLES_BROWSE_PATH} />
      </div>
    </StartCircleModalProvider>
  );
}
