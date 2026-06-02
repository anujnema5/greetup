import type { UseMediasoupRoomReturn } from "../types/mediasoup-room.types";

const noop = () => {};

/** Safe defaults while mediasoup chunk is not loaded or session is inactive. */
export const IDLE_MEDIASOUP_STATE: UseMediasoupRoomReturn = {
  status: "idle",
  error: null,
  localStream: null,
  remoteStream: null,
  mainStageShowsScreen: false,
  remoteParticipants: [],
  peers: {},
  micEnabled: false,
  cameraEnabled: false,
  screenSharing: false,
  toggleMic: noop,
  toggleCamera: noop,
  toggleScreenShare: noop,
  localPreviewStream: null,
  localScreenTrackId: null,
  remotePeerCameraStream: null,
  localMediaDeviceError: null,
  clearLocalMediaDeviceError: noop,
  screenShareTiles: [],
  focusedScreenShareKey: null,
  setFocusedScreenShareKey: noop,
  remoteTrackMediaSource: {},
  dominantSpeakerPeerId: null,
  dominantSpeakerSpeakingMs: {},
};
