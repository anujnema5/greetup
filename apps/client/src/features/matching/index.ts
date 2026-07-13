/**
 * Matching API (find / cancel / respond / peer preview) and `/space/[roomId]` room hook.
 *
 * - Types: `types/` (`matching-api.types`, `room.types` — `sessionKind` unions + layout helpers)
 * - RTC derivation: `utils/derive-room-rtc-state.ts`
 */
export { useRoom } from "./hooks/use-room";
export { useFindMatch } from "./hooks/useFindMatch";
export {
  MatchmakingProvider,
  useMatchmaking,
} from "./providers/matchmaking-provider";
export type { MatchmakingContextValue } from "./providers/matchmaking-provider";
export { MatchFoundDialog } from "./components/match-found-dialog";
export { MatchPrepDialog } from "./components/match-prep-dialog";
export { useMatchPeerPreview } from "./api/matching.queries";
export {
  useFindMatchMutation,
  useCancelMatchMutation,
  useRespondMatchProposalMutation,
} from "./api/matching.mutations";
export { patchMatchPeerPreviewCache } from "./lib/peer-preview-cache";
export type * from "./types";
export {
  isSpaceHostUser,
  isSpaceRoomData,
  isDirectMatchRoom,
  isPersistedSpaceSession,
  isRoomGroupLayout,
  resolveSpaceHostUserId,
} from "./types/room.types";
