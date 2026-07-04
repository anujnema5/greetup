import { authClient } from "@/lib/auth-client";

/** Fields merged onto Better Auth session user by GET /api/auth/get-session. */
export type AppSessionUser = {
  id?: string;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  isOnboarded?: boolean;
};

export type AppSession = {
  user?: AppSessionUser;
};

export function toAppSessionUser(
  user: unknown,
): AppSessionUser | undefined {
  if (!user || typeof user !== "object") return undefined;
  return user as AppSessionUser;
}

/** Routing gate: only explicit `true` counts as onboarded (missing/false → profile-setup). */
export function getSessionIsOnboarded(
  session: AppSession | null | undefined,
): boolean {
  return toAppSessionUser(session?.user)?.isOnboarded === true;
}

export function getSessionIsLoggedIn(
  session: AppSession | null | undefined,
): boolean {
  return Boolean(toAppSessionUser(session?.user)?.id);
}

/** Refresh session after profile changes so `isOnboarded` stays in sync. */
export async function refetchAppSession(): Promise<void> {
  await authClient.getSession();
}
