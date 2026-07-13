"use client";

import { TRY_ROUTE } from "@/features/guest-try/constants/try-routes";
import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";
import { LANDING_ENTRY } from "@/lib/copy/user-messages";

import { useLandingSession } from "./use-landing-session";

export type LandingVisitorKind = "anonymous" | "guest" | "member" | "loading";

const REGISTER_ROUTE = "/register";
const HOME_ROUTE = "/home";

const anonymousCta = {
  kind: "anonymous" as const,
  ready: true,
  navPrimaryHref: REGISTER_ROUTE,
  navPrimaryLabel: LANDING_ENTRY.getStarted,
  heroPrimaryHref: TRY_ROUTE,
  heroPrimaryLabel: LANDING_ENTRY.tryAsGuest,
  navGreeting: null,
  appHref: REGISTER_ROUTE,
};

const loadingCta = {
  ...anonymousCta,
  kind: "loading" as const,
  ready: false,
};

export function useLandingEntryCta() {
  const { isLoggedIn, firstName, ready: sessionReady } = useLandingSession();
  const { data: guestStatus, isPending: guestPending } = useGuestTryStatus({
    enabled: sessionReady && isLoggedIn,
  });

  if (!sessionReady || (isLoggedIn && guestPending)) {
    return loadingCta;
  }

  if (!isLoggedIn) {
    return anonymousCta;
  }

  if (guestStatus?.isGuest) {
    return {
      kind: "guest" as const,
      ready: true,
      navPrimaryHref: TRY_ROUTE,
      navPrimaryLabel: LANDING_ENTRY.continueTry,
      heroPrimaryHref: TRY_ROUTE,
      heroPrimaryLabel: LANDING_ENTRY.continueTry,
      navGreeting: null,
      appHref: TRY_ROUTE,
    };
  }

  return {
    kind: "member" as const,
    ready: true,
    navPrimaryHref: HOME_ROUTE,
    navPrimaryLabel: LANDING_ENTRY.goToHome,
    heroPrimaryHref: HOME_ROUTE,
    heroPrimaryLabel: firstName
      ? LANDING_ENTRY.welcome(firstName)
      : LANDING_ENTRY.goToHome,
    navGreeting: firstName ? LANDING_ENTRY.greeting(firstName) : null,
    appHref: HOME_ROUTE,
  };
}
