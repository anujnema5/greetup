import { queryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";

/** Drop cached guest-try status so a prior member session cannot bounce /try → /home. */
export function clearGuestTryQueries(): void {
  void queryClient.removeQueries({ queryKey: queryKeys.guestTry.all });
}
