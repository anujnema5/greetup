"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { StartCircleModalProvider } from "@/features/circles";

const RightPanel = dynamic(
  () => import("@/features/dashboard/components/right-panel").then((m) => m.RightPanel),
  { ssr: true },
);

/** Home adds the desktop insights rail beside the main column. */
export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <StartCircleModalProvider>
      <div className="flex min-w-0 flex-1 overflow-hidden">
        {children}
        <RightPanel />
      </div>
    </StartCircleModalProvider>
  );
}
