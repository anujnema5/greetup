import { createAuthClient } from "better-auth/react";

import { CURRENT_HOST } from "@/shared/constants/environments";

/** Same origin as the Next app so `/api/auth/*` goes through rewrites and session cookies stick. */
export const authClient = createAuthClient({
  baseURL: CURRENT_HOST,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, signUp, useSession } = authClient;
export const Session = authClient.$Infer.Session;
