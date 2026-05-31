"use client";

import { useEffect, useRef } from "react";

import { useSession } from "@/lib/auth-client";

import { useGetWelcomeTourStatusQuery } from "../api/tour-guide-api";
import { useTourGuide } from "../context/tour-guide-provider";

type WelcomeTourLauncherProps = {
  /** When true, defer auto-start (e.g. match prep dialog is open). */
  blocked?: boolean;
};

const AUTO_START_DELAY_MS = 900;

/**
 * Auto-starts the welcome tour once per account — first Home visit after onboarding.
 * Eligibility is persisted server-side (`user_profiles.welcome_tour_seen_at`).
 */
export function WelcomeTourLauncher({ blocked = false }: WelcomeTourLauncherProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const { startTour, isTourActive } = useTourGuide();
  const hasAttemptedRef = useRef(false);

  const {
    data: tourStatus,
    isLoading,
    isFetching,
  } = useGetWelcomeTourStatusQuery(undefined, {
    skip: !session?.user,
  });

  const statusReady = !isLoading && !isFetching;
  const eligible = tourStatus?.eligible === true;

  useEffect(() => {
    if (sessionPending || !session?.user || blocked || isTourActive) return;
    if (!statusReady || !eligible) return;
    if (hasAttemptedRef.current) return;

    hasAttemptedRef.current = true;

    const timer = window.setTimeout(() => {
      startTour("welcome");
    }, AUTO_START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    blocked,
    eligible,
    isTourActive,
    session?.user,
    sessionPending,
    startTour,
    statusReady,
  ]);

  return null;
}
