/**
 * Matching API (find / cancel / leave room, GET room) and `/circle/[roomId]` room hook.
 *
 * - Types: `types/` (`matching-api.types`, `room.types` — includes `isCircleRoomData` / `isDirectMatchRoom`)
 * - RTC derivation: `utils/derive-room-rtc-state.ts`
 */
export { useRoom } from "./hooks/use-room";
export { useFindMatch } from "./hooks/useFindMatch";
export {
  matchingApi,
  useFindMatchMutation,
  useCancelMatchMutation,
  useLeaveRoomMutation,
  useGetRoomQuery,
  useJoinRoomMutation,
  leaveRoomKeepalive,
} from "./api/matching-api";
export type * from "./types";
export { isCircleRoomData, isDirectMatchRoom } from "./types/room.types";
