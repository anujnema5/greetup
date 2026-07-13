import type { RequestConnectionResult } from "@/features/connections/types/connections-api.types";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";

export function connectionPatchFromRequestResult(
  result: RequestConnectionResult,
): { connectionState: PublicProfileConnectionState; connectionId: string | null } {
  const status = result.data?.status;
  const connectionId = result.data?.connectionId?.trim() || null;

  if (status === "accepted") {
    return { connectionState: "accepted", connectionId };
  }

  return { connectionState: "pending_outgoing", connectionId };
}
