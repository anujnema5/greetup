import { createAuthClient } from "better-auth/react";

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

export const { signIn, signOut, signUp, useSession } = authClient;
export const Session = authClient.$Infer.Session;
