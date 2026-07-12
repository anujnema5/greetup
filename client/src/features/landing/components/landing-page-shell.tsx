"use client";

import {
  LandingSessionProvider,
} from "../hooks/use-landing-session";

/**
 * Landing stays a marketing page. Logged-in full accounts are redirected by the
 * edge proxy (`/` → `/home`). No client exit loop / brand-loader refresh storm.
 */
export function LandingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingSessionProvider>
      <div className="landing-page relative min-h-screen bg-background text-foreground overflow-x-hidden">
        {children}
      </div>
    </LandingSessionProvider>
  );
}
