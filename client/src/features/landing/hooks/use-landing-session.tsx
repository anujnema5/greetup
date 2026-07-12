"use client";

import { createContext, useContext, useEffect, useState } from "react";

type SessionUser = {
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
};

type LandingSessionValue = {
  isLoggedIn: boolean;
  firstName: string;
  ready: boolean;
};

const defaultValue: LandingSessionValue = {
  isLoggedIn: false,
  firstName: "",
  ready: false,
};

const LandingSessionContext = createContext<LandingSessionValue>(defaultValue);

function parseSessionUser(user: SessionUser | undefined): Omit<LandingSessionValue, "ready"> {
  const displayName = user?.displayName?.trim() || user?.name?.trim() || "";
  const firstNameFromDisplay = displayName.split(/\s+/).filter(Boolean)[0] ?? "";
  const firstNameFromEmail = user?.email?.split("@")[0]?.trim() ?? "";

  return {
    firstName: firstNameFromDisplay || firstNameFromEmail,
    isLoggedIn: Boolean(user),
  };
}

export function LandingSessionProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<LandingSessionValue>(defaultValue);

  useEffect(() => {
    let cancelled = false;

    void import("@/lib/auth-client").then(({ authClient }) =>
      authClient.getSession().then(({ data }) => {
        if (cancelled) return;
        const parsed = parseSessionUser(data?.user as SessionUser | undefined);
        setValue({ ...parsed, ready: true });
      }),
    );

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
