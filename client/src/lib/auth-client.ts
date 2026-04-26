import { createAuthClient } from "better-auth/react";

import { API_BASE_URL } from "@/shared/constants/environments";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, signUp, useSession } = authClient;
export const Session = authClient.$Infer.Session;
