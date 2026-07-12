"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageLoading } from "@/components/page-loading";
import { POST_AUTH_PATH } from "@/features/auth/lib/auth-callback-url";
import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";

import {
  LandingSessionProvider,
  useLandingSession,
} from "../hooks/use-landing-session";

export function LandingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingSessionProvider>
      <LandingShellBody>{children}</LandingShellBody>
    </LandingSessionProvider>
  );
}

function LandingShellBody({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoggedIn, isOnboarded, ready } = useLandingSession();
  const { data: guestStatus, isPending: guestPending } = useGuestTryStatus({
    enabled: ready && isLoggedIn,
  });

  const isGuest = guestStatus?.isGuest === true;
  const isMember = ready && isLoggedIn && !guestPending && !isGuest;

  useEffect(() => {
    if (!isMember) return;
    router.replace(isOnboarded ? "/home" : POST_AUTH_PATH);
  }, [isMember, isOnboarded, router]);

  // Hold marketing UI for members so Login ↔ Go to home never flashes.
  if (ready && isLoggedIn && (guestPending || !isGuest)) {
    return <PageLoading />;
  }

  return (
    <div className="landing-page relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {children}
    </div>
  );
}
