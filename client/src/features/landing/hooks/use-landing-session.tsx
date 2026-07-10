"use client";

import { createContext, useContext, useEffect, useState } from "react";

import {
  toAppSessionUser,
  type AppSessionUser,
} from "@/features/auth/lib/session-user";

type LandingSessionValue = {
  isLoggedIn: boolean;
  isGuest: boolean;
  isOnboarded: boolean;
  firstName: string;
  ready: boolean;
};

const defaultValue: LandingSessionValue = {
  isLoggedIn: false,
  isGuest: false,
  isOnboarded: false,
  firstName: "",
  ready: false,
};

const LandingSessionContext = createContext<LandingSessionValue>(defaultValue);

function parseSessionUser(user: AppSessionUser | undefined) {
  const displayName = user?.displayName?.trim() || user?.name?.trim() || "";
  const firstNameFromDisplay = displayName.split(/\s+/).filter(Boolean)[0] ?? "";
  const firstNameFromEmail = user?.email?.split("@")[0]?.trim() ?? "";
  const firstName = firstNameFromDisplay || firstNameFromEmail;
  return {
    firstName,
    isLoggedIn: Boolean(user?.id),
    isGuest: user?.isGuest === true,
    isOnboarded: user?.isOnboarded === true,
  };
}

export function LandingSessionProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<LandingSessionValue>(defaultValue);

  useEffect(() => {
    let cancelled = false;

    void import("@/lib/auth-client")
      .then(({ authClient }) => authClient.getSession())
      .then(({ data }) => {
        if (cancelled) return;
        const user = toAppSessionUser(data?.user);
        const { firstName, isLoggedIn, isGuest, isOnboarded } = parseSessionUser(user);
        setValue({ isLoggedIn, isGuest, isOnboarded, firstName, ready: true });
      })
      .catch(() => {
        if (cancelled) return;
        setValue({ ...defaultValue, ready: true });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LandingSessionContext.Provider value={value}>{children}</LandingSessionContext.Provider>
  );
}

export function useLandingSession() {
  return useContext(LandingSessionContext);
}
