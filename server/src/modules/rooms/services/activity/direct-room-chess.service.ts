/**
 * Backwards-compatible export surface.
 * New implementation lives in `chess-activity.service.ts` + `room-activity.service.ts`.
 */
export {
  createDirectRoomChessInvite,
  endDirectRoomChessGame,
  respondDirectRoomChessInvite,
  type ChessEndResult,
  type ChessInviteResult,
  type ChessRespondResult,
  type DirectRoomChessErrorCode,
  DirectRoomChessError,
} from "./chess-activity.service";
