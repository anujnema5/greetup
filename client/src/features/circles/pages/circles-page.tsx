"use client";

import { StartCircleModalProvider } from "../components/start-circle-modal-provider";
import { CirclesBrowseView } from "../components/browse";

/** `/circles` — full browse for invited, joined, and public circles. */
export function CirclesPage() {
  return (
    <StartCircleModalProvider>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <CirclesBrowseView />
      </main>
    </StartCircleModalProvider>
  );
}
