/**
 * Matching API (find / cancel / leave room, GET room) and `/circle/[roomId]` room hook.
 *
 * - Types: `types/` (`matching-api.types`, `room.types` — includes `isCircleRoomData` / `isDirectMatchRoom`)
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
  useLeaveRoomMutation,
  useGetRoomQuery,
  useJoinRoomMutation,
  useExpandDirectInviteMutation,
  useExpandDirectRespondMutation,
  leaveRoomKeepalive,
} from "./api/matching-api";
export type * from "./types";
export { isCircleRoomData, isDirectMatchRoom, isRoomGroupLayout } from "./types/room.types";
