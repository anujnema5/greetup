"use client";

import { LandingSessionProvider } from "../hooks/use-landing-session";

export function LandingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingSessionProvider>
      <div className="dark relative min-h-screen bg-background text-foreground overflow-x-hidden">
        {children}
      </div>
    </LandingSessionProvider>
  );
}
