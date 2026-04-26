"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectRoomActiveActivity, selectRoomPhase } from "@/lib/redux/selectors/room-selectors";
import {
  useRoomChessDrawOfferMutation,
  useRoomChessEndMutation,
  useRoomChessInviteMutation,
} from "@/features/activity";
import { useRtcSocketContext } from "@/features/rtc";
import { AddToCircleDialog } from "@/features/room/components/add-to-circle-dialog";
import { RoomVideoView } from "@/features/room/components/room-video-view";
import { useRoomPeerChrome } from "@/features/room/hooks/use-room-peer-chrome";
import { useRoomVideo } from "@/features/room/hooks/use-room-video";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";

export type RoomVideoLayerProps = {
  roomId: string;
  peerId: string | null;
  scoreLabel: string | null;
  myName: string;
  isGroupRoom: boolean;
  groupRoomTitle: string | null;
};

export function RoomVideoLayer({
  roomId,
  peerId,
  scoreLabel,
  myName,
  isGroupRoom,
  groupRoomTitle,
}: RoomVideoLayerProps) {
  const { data: session } = useSession();
  const roomPhase = useAppSelector(selectRoomPhase);
  const activeRealtimeActivity = useAppSelector(selectRoomActiveActivity);
  const [addCircleOpen, setAddCircleOpen] = useState(false);
  const [inviteToChess, { isLoading: requestingChess }] = useRoomChessInviteMutation();
  const [endChess, { isLoading: endingChess }] = useRoomChessEndMutation();
  const [offerDraw, { isLoading: offeringDraw }] = useRoomChessDrawOfferMutation();
  const video = useRoomVideo(roomId);
  const {
    mediasoupStatus,
    mediasoupError,
    localMediaStream,
    remoteMediaStream,
    mainStageShowsScreen,
    remotePeerCameraStream,
    remoteParticipants,
    peers,
    rtcRoomType,
    micEnabled,
    cameraEnabled,
    screenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    localMediaDeviceError,
    clearLocalMediaDeviceError,
    roomConversationId,
  } = useRtcSocketContext();
  const excludeAddIds = [session?.user?.id, peerId].filter((x): x is string => Boolean(x));
  /** `null` while the RTC token query resolves — treat like direct; hide only when API says `circle`. */
  const showAddToCircle = !isGroupRoom && rtcRoomType !== "circle";

  const searchingForNextCandidate =
    !isGroupRoom && roomPhase === "searching";

  const handleRequestChessInvite = async () => {
    if (isGroupRoom) return;
    try {
      await inviteToChess({ roomId }).unwrap();
      toast.success("Chess invite sent");
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not send chess invite"));
    }
  };

  const handleEndActiveGame = async () => {
    if (!activeRealtimeActivity || activeRealtimeActivity.kind !== "chess") return;
    try {
      await endChess({ roomId, gameId: activeRealtimeActivity.gameId }).unwrap();
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not end chess game"));
    }
  };

  const handleOfferDraw = async () => {
    if (!activeRealtimeActivity || activeRealtimeActivity.kind !== "chess") return;
    try {
      await offerDraw({ roomId, gameId: activeRealtimeActivity.gameId }).unwrap();
      toast.success("Draw offer sent");
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not send draw offer"));
    }
  };

  const { peerLabel, remotePeerCameraOff, peerAvatarUrl } = useRoomPeerChrome({
    peerId,
    peers,
    isGroupRoom,
    groupRoomTitle,
  });

  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-hidden bg-background">
      <AddToCircleDialog
        open={addCircleOpen}
        onOpenChange={setAddCircleOpen}
        roomId={roomId}
        excludeUserIds={excludeAddIds}
      />
      <RoomVideoView
        onEnd={video.handleEnd}
        onSkip={video.handleSkip}
        onMinimize={video.handleMinimize}
        localStream={localMediaStream}
        remoteStream={remoteMediaStream}
        mainStageShowsScreen={mainStageShowsScreen}
        remotePeerCameraStream={remotePeerCameraStream}
        remoteParticipants={remoteParticipants}
        remotePeers={peers}
        isGroupRoom={isGroupRoom}
        showSkip={!isGroupRoom}
        mediaStatus={mediasoupStatus}
        mediaError={mediasoupError}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        rtcRoomType={rtcRoomType}
        screenSharing={screenSharing}
        onToggleScreenShare={toggleScreenShare}
        localMediaDeviceError={localMediaDeviceError}
        onDismissLocalMediaDeviceError={clearLocalMediaDeviceError}
        peerLabel={peerLabel}
        scoreLabel={scoreLabel}
        myName={myName}
        currentUserId={session?.user?.id ?? null}
        myAvatarUrl={session?.user?.image ?? null}
        peerAvatarUrl={peerAvatarUrl}
        remotePeerCameraOff={remotePeerCameraOff}
        conversationId={roomConversationId}
        showAddToCircle={showAddToCircle}
        onOpenAddToCircle={() => setAddCircleOpen(true)}
        searchingForNextCandidate={searchingForNextCandidate}
        activeRealtimeActivity={activeRealtimeActivity}
        onRequestChessInvite={() => void handleRequestChessInvite()}
        requestChessBusy={requestingChess}
        onEndActiveGame={() => void handleEndActiveGame()}
        onOfferDrawGame={() => void handleOfferDraw()}
      />
    </div>
  );
}
