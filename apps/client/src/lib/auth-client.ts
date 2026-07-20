import { createAuthClient } from "better-auth/react";

import { clearGuestTryQueries } from "@/features/guest-try/lib/clear-guest-try-queries";
import { API_BASE_URL } from "@/shared/constants/environments";

/**
 * Must be origin only (no `/api`). better-auth's client merges `baseURL` + `basePath`;
 * if `baseURL` already has a path, it does not add `/api/auth` and you get broken paths like `/api/sign-in/social`.
 * Server: `HTTP_PATHS.authGlob` = `/api/auth/*` (see `server/src/http/create-app.ts`).
 */
const authOrigin = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");

export const authClient = createAuthClient({
  baseURL: authOrigin,
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, useSession } = authClient;
export const Session = authClient.$Infer.Session;

/** Sign out and drop guest-try cache so the next /try visit cannot reuse a member status. */
export async function signOut(
  ...args: Parameters<typeof authClient.signOut>
): Promise<ReturnType<typeof authClient.signOut>> {
  const result = await authClient.signOut(...args);
  clearGuestTryQueries();
  return result;
}
