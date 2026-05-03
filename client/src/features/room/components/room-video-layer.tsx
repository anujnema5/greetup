"use client";

/**
 * RoomVideoLayer is the room frontend orchestration layer between RTC state and presentational UI.
 *
 * Purpose:
 * - Reads mediasoup/socket state from `useRtcSocketContext`.
 * - Derives peer labels, camera/mic status, and direct-vs-circle behavior.
 * - Wires room actions (end, skip, minimize, add-to-circle, chess controls) into `RoomVideoView`.
 *
 * Keep this file focused on state composition + event wiring, not low-level tile rendering.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectRoomPhase } from "@/lib/redux/selectors/room-selectors";
import { selectRoomActiveActivity } from "@/lib/redux/selectors/room-activity-selectors";
import { setDirectCallPeerLabel } from "@/lib/redux/slices/room-slice";
import {
  useRoomChessDrawOfferMutation,
  useRoomChessEndMutation,
  useRoomChessInviteMutation,
} from "@/features/activity";
import { useRtcSocketContext } from "@/features/rtc";
import { useMatchmaking } from "@/features/matching";
import { AddToCircleDialog } from "@/features/room/components/add-to-circle-dialog";
import { RoomVideoView } from "@/features/room/components/room-video-view";
import { useRoomPeerChrome } from "@/features/room/hooks/use-room-peer-chrome";
import { useRoomVideo } from "@/features/room/hooks/use-room-video";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import {
  resolveEmbeddedActivityCallPolicy,
  toastMessageForBlockedInvite,
  useRoomEmbeddedActivitiesCatalog,
} from "@/features/room/embedded-activities";
import type { RoomActivityId } from "@/features/room/types/room-activity.types";

export type RoomVideoLayerProps = {
  roomId: string;
  peerId: string | null;
  scoreLabel: string | null;
  myName: string;
  isGroupRoom: boolean;
  groupRoomTitle: string | null;
  circleCanEditTitle?: boolean;
};

export function RoomVideoLayer({
  roomId,
  peerId,
  scoreLabel,
  myName,
  isGroupRoom,
  groupRoomTitle,
  circleCanEditTitle = false,
}: RoomVideoLayerProps) {
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const roomPhase = useAppSelector(selectRoomPhase);
  const activeRealtimeActivity = useAppSelector(selectRoomActiveActivity);
  const [addCircleOpen, setAddCircleOpen] = useState(false);
  const [embeddedStageActivityId, setEmbeddedStageActivityId] =
    useState<RoomActivityId | null>(null);
  const [inviteToChess, { isLoading: requestingChess }] = useRoomChessInviteMutation();
  const [endChess, { isLoading: endingChess }] = useRoomChessEndMutation();
  const [offerDraw, { isLoading: offeringDraw }] = useRoomChessDrawOfferMutation();
  const video = useRoomVideo(roomId);
  const {
    mediasoupStatus,
    mediasoupError,
    localMediaStream,
    localCompositeStream,
    localScreenTrackId,
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
    screenShareTiles,
    focusedScreenShareKey,
    setFocusedScreenShareKey,
    remoteTrackMediaSource,
  } = useRtcSocketContext();

  /** DB-backed tiles + policy map; invite gating uses `embeddedStageActivityId` (can run ahead of Redux). */
  const { directRoomActivities, embeddedCallPolicyLookup } = useRoomEmbeddedActivitiesCatalog();

  const excludeAddIds = [
    session?.user?.id,
    peerId,
    ...(isGroupRoom ? Object.keys(peers) : []),
  ].filter((x): x is string => Boolean(x));

  const embeddedCallPolicy = useMemo(
    () =>
      resolveEmbeddedActivityCallPolicy({
        stageActivityId: embeddedStageActivityId,
        synchronizedActivity: activeRealtimeActivity ?? null,
        policyByActivity: embeddedCallPolicyLookup,
      }),
    [embeddedStageActivityId, activeRealtimeActivity, embeddedCallPolicyLookup],
  );

  const showAddToCircle = !embeddedCallPolicy.blockParticipantInvites;

  const openAddToCircle = useCallback(() => {
    const msg = toastMessageForBlockedInvite(embeddedCallPolicy);
    if (msg) {
      toast.info(msg);
      return;
    }
    setAddCircleOpen(true);
  }, [embeddedCallPolicy]);

  const searchingForNextCandidate =
    !isGroupRoom && roomPhase === "searching";
  const matchmaking = useMatchmaking();
  const directCallMatchSearchFailed =
    searchingForNextCandidate && matchmaking.status === "error";

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

  const { peerLabel, remotePeerCameraOff, remotePeerMicOff, peerAvatarUrl } = useRoomPeerChrome({
    peerId,
    peers,
    isGroupRoom,
    groupRoomTitle,
  });

  useEffect(() => {
    dispatch(setDirectCallPeerLabel(isGroupRoom ? null : peerLabel));
  }, [dispatch, isGroupRoom, peerLabel]);

  useEffect(() => {
    if (!embeddedCallPolicy.blockParticipantInvites) return;
    const id = requestAnimationFrame(() => setAddCircleOpen(false));
    return () => cancelAnimationFrame(id);
  }, [embeddedCallPolicy.blockParticipantInvites]);

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
        localCompositeStream={localCompositeStream}
        localScreenTrackId={localScreenTrackId}
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
        remotePeerMicOff={remotePeerMicOff}
        conversationId={roomConversationId}
        showAddToCircle={showAddToCircle}
        onOpenAddToCircle={openAddToCircle}
        searchingForNextCandidate={searchingForNextCandidate}
        directCallMatchSearchFailed={directCallMatchSearchFailed}
        directCallMatchSearchError={
          directCallMatchSearchFailed ? matchmaking.error : null
        }
        onRetryDirectCallMatchSearch={() => matchmaking.handleFindMatch()}
        activeRealtimeActivity={activeRealtimeActivity}
        onRequestChessInvite={() => void handleRequestChessInvite()}
        requestChessBusy={requestingChess}
        onEndActiveGame={() => void handleEndActiveGame()}
        onOfferDrawGame={() => void handleOfferDraw()}
        roomId={roomId}
        circleDisplayTitle={groupRoomTitle}
        circleCanEditTitle={circleCanEditTitle}
        screenShareTiles={screenShareTiles}
        focusedScreenShareKey={focusedScreenShareKey}
        onSelectScreenShare={setFocusedScreenShareKey}
        remoteTrackMediaSource={remoteTrackMediaSource}
        onEmbeddedStageActivityChange={setEmbeddedStageActivityId}
        directRoomActivities={directRoomActivities}
        embeddedCallPolicyLookup={embeddedCallPolicyLookup}
      />
    </div>
  );
}
