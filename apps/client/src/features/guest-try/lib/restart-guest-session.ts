import { authClient } from "@/lib/auth-client";

import { clearGuestTryQueries } from "./clear-guest-try-queries";

type RestartGuestSessionArgs = {
  createGuestSession: (
    variables: undefined,
    options?: { onSuccess?: () => void },
  ) => void;
  refetchStatus: () => Promise<unknown>;
  resetGuestSession: () => void;
};

export async function restartGuestSession({
  createGuestSession,
  refetchStatus,
  resetGuestSession,
}: RestartGuestSessionArgs): Promise<void> {
  await authClient.signOut();
  clearGuestTryQueries();
  resetGuestSession();
  createGuestSession(undefined, {
    onSuccess: () => {
      void refetchStatus();
    },
  });
}
