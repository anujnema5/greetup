"use client";

import { LandingSessionProvider } from "../hooks/use-landing-session";

export function LandingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingSessionProvider>
      <div className="relative min-h-screen bg-[oklch(12%_0.012_110)] text-white overflow-x-hidden">
        {children}
      </div>
    </LandingSessionProvider>
  );
}
