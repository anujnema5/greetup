import type { RtcSocketContextValue } from "@/features/rtc/types/rtc-socket-context.types";
import type { RoomRtcState } from "@/features/rtc/types/rtc-api.types";
import type { UseRtcSocketReturn } from "@/features/rtc/hooks/use-rtc-socket";

const noop = () => {};
const noopSetFocusedScreenShareKey = (_key: string | null) => {};

const IDLE_RTC: RoomRtcState = {
  rtcToken: null,
  rtcTokenExpiresInSec: null,
  rtcTokenLoading: false,
  rtcTokenError: null,
  rtcTokenErrorCode: null,
  rtcTokenSkipped: true,
  refetchRtcToken: noop,
};

const IDLE_SOCKET: UseRtcSocketReturn = {
  rtcSocket: null,
  rtcSocketState: "idle",
};

/** Mediasoup + RTC fields used when no live call session is active. */
export function createIdleRtcSocketContextValue(
  activeRoomId: string | null,
): RtcSocketContextValue {
  return {
    ...IDLE_RTC,
    ...IDLE_SOCKET,
    rtcRoomId: activeRoomId,
    roomConversationId: null,
    rtcRoomType: null,
    mediasoupStatus: "idle",
    mediasoupError: null,
    localMediaStream: null,
    localCompositeStream: null,
    localScreenTrackId: null,
    remoteMediaStream: null,
    mainStageShowsScreen: false,
    remotePeerCameraStream: null,
    remoteParticipants: [],
    peers: {},
    micEnabled: false,
    cameraEnabled: false,
    screenSharing: false,
    toggleMic: noop,
    toggleCamera: noop,
    toggleScreenShare: noop,
    localMediaDeviceError: null,
    clearLocalMediaDeviceError: noop,
    screenShareTiles: [],
    focusedScreenShareKey: null,
    setFocusedScreenShareKey: noopSetFocusedScreenShareKey,
    remoteTrackMediaSource: {},
    dominantSpeakerPeerId: null,
    dominantSpeakerSpeakingMs: {},
  };
}

/** Stub context while the lazy mediasoup chunk is loading. */
export function createConnectingRtcSocketContextValue(
  activeRoomId: string,
): RtcSocketContextValue {
  return {
    ...createIdleRtcSocketContextValue(activeRoomId),
    rtcTokenLoading: true,
    mediasoupStatus: "connecting_socket",
  };
}
