"use client";

import { TRY_ROUTE } from "@/features/guest-try/constants/try-routes";
import { LANDING_ENTRY } from "@/lib/copy/user-messages";

import { useLandingSession } from "./use-landing-session";

export type LandingVisitorKind = "anonymous" | "guest" | "member" | "loading";

const REGISTER_ROUTE = "/register";
const HOME_ROUTE = "/home";

export function useLandingEntryCta() {
  const { isLoggedIn, isGuest, firstName, ready: sessionReady } = useLandingSession();

  const kind: LandingVisitorKind = !sessionReady
    ? "loading"
    : !isLoggedIn
      ? "anonymous"
      : isGuest
        ? "guest"
        : "member";

  if (kind === "loading") {
    return {
      kind,
      ready: false,
      navPrimaryHref: REGISTER_ROUTE,
      navPrimaryLabel: LANDING_ENTRY.getStarted,
      heroPrimaryHref: TRY_ROUTE,
      heroPrimaryLabel: LANDING_ENTRY.tryAsGuest,
      navGreeting: null,
      appHref: REGISTER_ROUTE,
    } as const;
  }

  if (kind === "member") {
    const greeting = firstName ? LANDING_ENTRY.greeting(firstName) : null;
    const label = firstName ? LANDING_ENTRY.welcome(firstName) : LANDING_ENTRY.goToHome;
    return {
      kind,
      ready: true,
      navPrimaryHref: HOME_ROUTE,
      navPrimaryLabel: LANDING_ENTRY.goToHome,
      heroPrimaryHref: HOME_ROUTE,
      heroPrimaryLabel: label,
      navGreeting: greeting,
      appHref: HOME_ROUTE,
    } as const;
  }

  if (kind === "guest") {
    return {
      kind,
      ready: true,
      navPrimaryHref: TRY_ROUTE,
      navPrimaryLabel: LANDING_ENTRY.continueTry,
      heroPrimaryHref: TRY_ROUTE,
      heroPrimaryLabel: LANDING_ENTRY.continueTry,
      navGreeting: null,
      appHref: TRY_ROUTE,
    } as const;
  }

  return {
    kind,
    ready: true,
    navPrimaryHref: REGISTER_ROUTE,
    navPrimaryLabel: LANDING_ENTRY.getStarted,
    heroPrimaryHref: TRY_ROUTE,
    heroPrimaryLabel: LANDING_ENTRY.tryAsGuest,
    navGreeting: null,
    appHref: REGISTER_ROUTE,
  } as const;
}
