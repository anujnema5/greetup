import { createAuthClient } from "better-auth/react";

import { API_BASE_URL } from "@/shared/constants/environments";

const authOrigin = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");

export const authClient = createAuthClient({
  baseURL: authOrigin,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, signUp, useSession } = authClient;
export const Session = authClient.$Infer.Session;
