import type { MediasoupRoomStatus, ProducerMediaSource, RemoteParticipant, RemotePeer, ScreenShareTileInfo } from "@/features/rtc/types/mediasoup-room.types";
import type { RoomRtcState } from "@/features/rtc/types/rtc-api.types";
import type { UseRtcSocketReturn } from "@/features/rtc/hooks/use-rtc-socket";
import type { RoomSessionType } from "@/shared/types/room-session";

export type RtcSocketContextValue = RoomRtcState &
  UseRtcSocketReturn & {
    rtcRoomId: string | null;
    roomConversationId: string | null;
    mediasoupStatus: MediasoupRoomStatus;
    mediasoupError: string | null;
    localMediaStream: MediaStream | null;
    localCompositeStream: MediaStream | null;
    localScreenTrackId: string | null;
    remoteMediaStream: MediaStream | null;
    mainStageShowsScreen: boolean;
    remotePeerCameraStream: MediaStream | null;
    remoteParticipants: RemoteParticipant[];
    peers: Record<string, RemotePeer>;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    toggleMic: () => void;
    toggleCamera: () => void;
    toggleScreenShare: () => void;
    rtcRoomType: RoomSessionType | null;
    localMediaDeviceError: string | null;
    clearLocalMediaDeviceError: () => void;
    screenShareTiles: ScreenShareTileInfo[];
    focusedScreenShareKey: string | null;
    setFocusedScreenShareKey: (key: string | null) => void;
    remoteTrackMediaSource: Record<string, ProducerMediaSource>;
    dominantSpeakerPeerId: string | null;
    dominantSpeakerSpeakingMs: Record<string, number>;
  };
