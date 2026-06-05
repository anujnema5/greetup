/**
 * Matching API (find / cancel / respond / peer preview) and `/circle/[roomId]` room hook.
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
export {
  matchingApi,
  useFindMatchMutation,
  useCancelMatchMutation,
  useGetMatchPeerPreviewQuery,
} from "./api/matching-api";
export type * from "./types";
export {
  isCircleHostUser,
  isCircleRoomData,
  isDirectMatchRoom,
  isPersistedCircleSession,
  isRoomGroupLayout,
  resolveCircleHostUserId,
} from "./types/room.types";
