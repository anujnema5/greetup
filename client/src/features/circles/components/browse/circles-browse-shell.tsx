"use client";

import type { ReactNode } from "react";

/** Main column wrapper for `/circles` — full width on desktop. */
export function CirclesBrowseShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 px-4 md:px-8 lg:px-10 py-6 pb-10 w-full min-w-0">
      {children}
    </div>
  );
}
