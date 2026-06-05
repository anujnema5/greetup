/**
 * RTC / video calling (rtc-service + mediasoup-client).
 *
 * Layout:
 * - Token HTTP: `api/rtc-api.ts`, `types/rtc-api.types.ts`
 * - Socket: `hooks/use-rtc-socket.ts`, `providers/rtc-socket-provider.tsx`
 * - Room orchestration: `hooks/use-mediasoup-room.ts` composes:
 *   - `hooks/use-mediasoup-room-session.ts` — join, transports, consumers
 *   - `hooks/use-mediasoup-local-media.ts` — mic / camera / screen produce
 * - Pure helpers: `lib/rtc-signaling.ts`, `lib/mediasoup-transport-wiring.ts`,
 *   `lib/mediasoup-stream-helpers.ts`, `lib/mediasoup-produce-config.ts`, `lib/mediasoup-local-capture-constraints.ts`,
 *   `lib/rtc-mobile-profile.ts`, `lib/remote-participant-streams.ts`,
 *   `lib/direct-call-stage.ts` (1:1 main-tile stream math), `lib/media-stream-utils.ts`
 * - Mobile Web UI flag: `hooks/use-mobile-web-rtc-ui.ts`
 * - Hook wiring types: `types/mediasoup-hooks.types.ts` (refs/setters passed between hooks)
 */

export { useRtcToken } from "./api/rtc.queries";
export { invalidateRtcTokenCache, patchRtcTokenRoomTypeInCache } from "./lib/rtc-token-cache";
export type { RoomRtcState, RtcTokenApiResponse, RtcTokenPayload } from "./types/rtc-api.types";
export { useRtcSocket } from "./hooks/use-rtc-socket";
export type { RtcSocketState, UseRtcSocketReturn } from "./hooks/use-rtc-socket";
export {
  RtcSocketProvider,
  useRtcSocketContext,
} from "./providers/rtc-socket-provider";
export type { RtcSocketContextValue } from "./providers/rtc-socket-provider";
export { useMobileWebRtcUi } from "./hooks/use-mobile-web-rtc-ui";
export { useMediasoupRoom } from "./hooks/use-mediasoup-room";
export type {
  MediasoupRoomStatus,
  ProducerMediaSource,
  RemotePeer,
  RemoteParticipant,
  ScreenShareTileInfo,
  UseMediasoupRoomArgs,
  UseMediasoupRoomReturn,
} from "./types/mediasoup-room.types";
export {
  mergeGroupGalleryParticipants,
  pickPrimaryRemoteStream,
  remoteParticipantsFromRecord,
  remotePeerIdsStableKey,
  remotePeerCountFromStableKey,
} from "./lib/remote-participant-streams";
export {
  createPlaybackStreamWithClonedVideo,
  hasLiveEnabledVideo,
  hasLiveMedia,
  hasLiveVideo,
  hasRenderableRemoteVideo,
  mediaStreamVideoAttachRevision,
} from "./lib/media-stream-utils";
export {
  RTC_CONNECTION_RECOVERY,
  ICE_RESTART_MIN_GAP_MS,
  isRecoverableTransportState,
} from "./constants/connection-recovery";
