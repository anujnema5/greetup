import { authClient } from "@/lib/auth-client";

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
  resetGuestSession();
  createGuestSession(undefined, {
    onSuccess: () => {
      void refetchStatus();
    },
  });
}
