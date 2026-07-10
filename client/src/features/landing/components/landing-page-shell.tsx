"use client";

import { LandingAuthenticatedRedirect } from "./landing-authenticated-redirect";
import {
  LandingSessionProvider,
  useLandingSession,
} from "../hooks/use-landing-session";

/**
 * While session is resolving (or a full account is about to leave for /home),
 * keep a blank shell so marketing UI does not flash before the redirect.
 */
function LandingShellBody({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isGuest, ready } = useLandingSession();
  const suppressMarketing = !ready || (isLoggedIn && !isGuest);

  if (suppressMarketing) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  return (
    <div className="landing-page relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {children}
    </div>
  );
}

export function LandingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingSessionProvider>
      <LandingAuthenticatedRedirect />
      <LandingShellBody>{children}</LandingShellBody>
    </LandingSessionProvider>
  );
}
