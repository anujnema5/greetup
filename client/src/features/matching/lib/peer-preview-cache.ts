import { matchingApi } from "@/features/matching/api/matching-api";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";
import type { AppDispatch } from "@/lib/redux/store";

/** Updates cached `getMatchPeerPreview` connection fields without a network round-trip. */
export function patchMatchPeerPreviewCache(
  dispatch: AppDispatch,
  peerUserId: string,
  patch: {
    connectionState: PublicProfileConnectionState;
    connectionId: string | null;
  },
): void {
  dispatch(
    matchingApi.util.updateQueryData("getMatchPeerPreview", peerUserId, (draft) => {
      if (!draft) return;
      draft.connectionState = patch.connectionState;
      draft.connectionId = patch.connectionId;
    }),
  );
}
