"use client";

import { LandingSessionProvider } from "../hooks/use-landing-session";
import { LandingAuthRedirect } from "./landing-auth-redirect";

/**
 * Marketing shell. Logged-in members are sent to `/home` by the edge proxy,
 * with a client redirect as a production safety net when the proxy auth check fails open.
 */
export function LandingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingSessionProvider>
      <LandingAuthRedirect />
      <div className="landing-page relative min-h-screen bg-background text-foreground overflow-x-hidden">
        {children}
      </div>
    </LandingSessionProvider>
  );
}
