"use client";

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
import {
  useOpenCircleMeetingMutation,
  useStartScheduledCircleMutation,
} from "@/features/room/api/room-api";
import { Button } from "@/components/ui/button";
import { AddToCircleDialog } from "@/features/room/components/dialogs/add-to-circle-dialog";
import { CircleLobbyOverlay } from "@/features/room/components/lobby/circle-lobby-overlay";
import { InCallScreen } from "@/features/room/call/shell/in-call-screen";
import { useRemoteParticipantLabel } from "@/features/room/hooks/media/use-remote-participant-label";
import { useRoomVideo } from "@/features/room/hooks/session/use-room-video";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import { buildCallCapabilities } from "@/features/room/contracts";
import {
  resolveEmbeddedActivityCallPolicy,
  shouldShowDirectCallActivitiesTab,
  toastMessageForBlockedInvite,
  useRoomEmbeddedActivitiesCatalog,
} from "@/features/room/embedded-activities";
import type { RoomActivityId } from "@/features/room/types/call/room-activity.types";
import { formatScheduledStart } from "@/lib/datetime/format-scheduled-start";
import { isClientStillBeforeScheduledStart } from "@/lib/datetime/scheduled-start-guards";

export type InCallContainerProps = {
  roomId: string;
  peerId: string | null;
  scoreLabel: string | null;
  myName: string;
  isGroupRoom: boolean;
  groupRoomTitle: string | null;
  circleCanEditTitle?: boolean;
  /** DB circle host — used for “open circle for everyone” lobby control. */
  circleHostUserId?: string | null;
  /** From GET `/room/:id` Redis payload (`db_room`). */
  circleLobbyGateActive?: "0" | "1" | null;
  /** ISO scheduled start from GET room — pre-start lobby (G-Meet–style time line). */
  circleScheduledStartAt?: string | null;
  /** Postgres circle lifecycle from GET room (`scheduled`, `live`, …). */
  circleRoomStatus?: string | null;
  /** True for a persisted circle room (`sessionKind: "db_room"`), not a Redis match pair. */
  isDbCircleCall?: boolean;
};

export function InCallContainer({
  roomId,
  peerId,
  scoreLabel,
  myName,
  isGroupRoom,
  groupRoomTitle,
  circleCanEditTitle = false,
  circleHostUserId = null,
  circleLobbyGateActive = null,
  circleScheduledStartAt = null,
  circleRoomStatus = null,
  isDbCircleCall = false,
}: InCallContainerProps) {
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
  const [openCircleMeeting, { isLoading: openingCircleMeeting }] =
    useOpenCircleMeetingMutation();
  const [startScheduledCircle, { isLoading: startingScheduledCircle }] =
    useStartScheduledCircleMutation();
  const video = useRoomVideo(roomId, {
    isDbCircleCall,
    circleHostUserId,
  });
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
    rtcToken,
    rtcTokenLoading,
    rtcTokenError,
    rtcTokenErrorCode,
    refetchRtcToken,
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
    dominantSpeakerPeerId,
    dominantSpeakerSpeakingMs,
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

  const showActivitiesTab = shouldShowDirectCallActivitiesTab(isGroupRoom, directRoomActivities);

  const callCapabilities = useMemo(
    () =>
      buildCallCapabilities({
        isGroupRoom,
        participantCount: isGroupRoom
          ? remoteParticipants.length + 1
          : peerId
            ? 2
            : 1,
        activeActivityId: embeddedStageActivityId,
        activeRealtimeActivity: activeRealtimeActivity ?? null,
        embeddedPolicyLookup: embeddedCallPolicyLookup,
        showActivitiesTab,
        hasScreenShare: screenShareTiles.length > 0 || mainStageShowsScreen,
        directSoloLayout: !isGroupRoom && !peerId,
        useCircleGallery: isGroupRoom && remoteParticipants.length + 1 > 6,
      }),
    [
      isGroupRoom,
      remoteParticipants.length,
      peerId,
      embeddedStageActivityId,
      activeRealtimeActivity,
      embeddedCallPolicyLookup,
      showActivitiesTab,
      screenShareTiles.length,
      mainStageShowsScreen,
    ],
  );

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

  const { peerLabel, remotePeerCameraOff, remotePeerMicOff, peerAvatarUrl } = useRemoteParticipantLabel({
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

  type LobbyGateCode = "LOBBY_NOT_READY" | "LOBBY_WAITING_FOR_HOST";
  const [stickyLobbyGateCode, setStickyLobbyGateCode] = useState<LobbyGateCode | null>(null);

  useEffect(() => {
    queueMicrotask(() => setStickyLobbyGateCode(null));
  }, [roomId]);

  useEffect(() => {
    queueMicrotask(() => {
      if (rtcToken) {
        setStickyLobbyGateCode(null);
        return;
      }
      if (rtcTokenErrorCode === "LOBBY_NOT_READY" || rtcTokenErrorCode === "LOBBY_WAITING_FOR_HOST") {
        setStickyLobbyGateCode(rtcTokenErrorCode);
      }
    });
  }, [rtcTokenErrorCode, rtcToken]);

  /** Keeps lobby visible while RTK refetch clears `isError` (avoids flash of the call UI). */
  const rtcLobbyGateCode = useMemo((): LobbyGateCode | null => {
    if (rtcTokenErrorCode === "LOBBY_NOT_READY" || rtcTokenErrorCode === "LOBBY_WAITING_FOR_HOST") {
      return rtcTokenErrorCode;
    }
    if (
      rtcTokenLoading &&
      !rtcToken &&
      (stickyLobbyGateCode === "LOBBY_NOT_READY" || stickyLobbyGateCode === "LOBBY_WAITING_FOR_HOST")
    ) {
      return stickyLobbyGateCode;
    }
    return null;
  }, [rtcTokenErrorCode, rtcTokenLoading, rtcToken, stickyLobbyGateCode]);

  const isHostUser = Boolean(
    session?.user?.id && circleHostUserId && session.user.id === circleHostUserId,
  );
  const guestLobbyWait =
    isGroupRoom && !isHostUser && rtcLobbyGateCode === "LOBBY_WAITING_FOR_HOST";

  const circleLobbyScheduledNotReady = isGroupRoom && rtcLobbyGateCode === "LOBBY_NOT_READY";

  const rtcLobbyWait = guestLobbyWait || circleLobbyScheduledNotReady;

  const hostCanStartScheduledCircleNow = Boolean(
    isDbCircleCall &&
      isHostUser &&
      circleRoomStatus === "scheduled",
  );

  const scheduledLobbyLabel = useMemo(
    () => formatScheduledStart(circleScheduledStartAt ?? undefined),
    [circleScheduledStartAt],
  );

  const handleLobbyJoinCircle = useCallback(() => {
    if (
      circleLobbyScheduledNotReady &&
      isClientStillBeforeScheduledStart(circleScheduledStartAt) &&
      !isHostUser
    ) {
      const when = scheduledLobbyLabel?.trim();
      toast.error(
        when
          ? `This circle hasn’t opened yet. You can join after ${when} (your device time).`
          : "This circle hasn’t opened yet — try again after the scheduled start time.",
        { id: `circle-lobby-join-${roomId}` },
      );
      return;
    }
    void refetchRtcToken();
  }, [
    circleLobbyScheduledNotReady,
    circleScheduledStartAt,
    isHostUser,
    scheduledLobbyLabel,
    refetchRtcToken,
    roomId,
  ]);

  useEffect(() => {
    if (!rtcLobbyWait) return;
    const id = window.setInterval(() => {
      if (circleLobbyScheduledNotReady && isClientStillBeforeScheduledStart(circleScheduledStartAt)) {
        return;
      }
      refetchRtcToken();
    }, 10000);
    return () => window.clearInterval(id);
  }, [rtcLobbyWait, refetchRtcToken, circleLobbyScheduledNotReady, circleScheduledStartAt]);

  const handleOpenCircleMeeting = useCallback(async () => {
    try {
      await openCircleMeeting(roomId).unwrap();
      toast.success("Everyone can join the circle now.");
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not open the circle for everyone"));
    }
  }, [openCircleMeeting, roomId]);

  const handleHostStartScheduledCircleNow = useCallback(async () => {
    try {
      await startScheduledCircle(roomId).unwrap();
      toast.success("Circle is live — connecting you now.");
      void refetchRtcToken();
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not start the circle"));
    }
  }, [refetchRtcToken, roomId, startScheduledCircle]);

  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-hidden bg-background">
      {rtcLobbyWait ? (
        <CircleLobbyOverlay
          open
          circleTitle={groupRoomTitle}
          scheduledLabel={scheduledLobbyLabel}
          waitingForScheduledStart={circleLobbyScheduledNotReady}
          rtcTokenError={rtcTokenError}
          rtcTokenLoading={rtcTokenLoading}
          onJoinCircle={handleLobbyJoinCircle}
          viewerDisplayName={myName}
          hostCanStartScheduledNow={hostCanStartScheduledCircleNow}
          hostStartScheduledBusy={startingScheduledCircle}
          onHostStartScheduledNow={() => void handleHostStartScheduledCircleNow()}
        />
      ) : null}
      {isGroupRoom && isHostUser && circleLobbyGateActive === "1" ? (
        <div className="pointer-events-auto absolute top-4 left-1/2 z-[150] flex -translate-x-1/2 justify-center px-4">
          <Button
            type="button"
            size="sm"
            className="shadow-md"
            disabled={openingCircleMeeting}
            onClick={() => void handleOpenCircleMeeting()}
          >
            {openingCircleMeeting ? "Starting…" : "Open circle for everyone"}
          </Button>
        </div>
      ) : null}
      <AddToCircleDialog
        open={addCircleOpen}
        onOpenChange={setAddCircleOpen}
        roomId={roomId}
        excludeUserIds={excludeAddIds}
      />
      <InCallScreen
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
        onHostEndCircleForEveryone={
          isDbCircleCall && circleCanEditTitle ? video.handleHostEndCircleForEveryone : undefined
        }
        screenShareTiles={screenShareTiles}
        focusedScreenShareKey={focusedScreenShareKey}
        onSelectScreenShare={setFocusedScreenShareKey}
        remoteTrackMediaSource={remoteTrackMediaSource}
        onEmbeddedStageActivityChange={setEmbeddedStageActivityId}
        directRoomActivities={directRoomActivities}
        embeddedCallPolicyLookup={embeddedCallPolicyLookup}
        dominantSpeakerPeerId={dominantSpeakerPeerId}
        dominantSpeakerSpeakingMs={dominantSpeakerSpeakingMs}
        callCapabilities={callCapabilities}
      />
    </div>
  );
}
