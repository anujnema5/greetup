"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import {
  selectRoomActiveActivity,
  useRoomActivityStore,
} from "@/features/room/state/room-activity.store";
import { selectLocalLeavePending, selectRoomPhase, useRoomStore } from "@/features/room/state/room.store";
import {
  useRoomChessDrawOffer,
  useRoomChessEnd,
  useRoomChessInvite,
} from "@/features/activity/api/activity.mutations";
import { useRtcSocketContext } from "@/features/rtc";
import { useMatchmaking, useRoom } from "@/features/matching";
import {
  useOpenSpaceMeeting,
  useStartScheduledSpace,
} from "@/features/room/api/room.mutations";
import { Button } from "@/components/ui/button";
import { AddToSpaceDialog } from "@/features/room/components/dialogs/add-to-space-dialog";
import { SpaceLobbyOverlay } from "@/features/room/components/lobby/space-lobby-overlay";
import { SpaceNsfwModerationLayer } from "@/features/moderation";
import { RoomSessionExpiryWarningsLayer } from "@/features/room/components/session/room-session-expiry-warnings-layer";
import { useCallRenderDebug } from "@/features/room/hooks/debug/use-call-render-debug";
import { InCallScreen } from "@/features/room/call/shell/in-call-screen";
import { useRemoteParticipantLabel } from "@/features/room/hooks/media/use-remote-participant-label";
import { useRoomVideo } from "@/features/room/hooks/session/use-room-video";
import { useLobbyPreviewMedia } from "@/features/room/hooks/lobby/use-lobby-preview-media";
import { setLobbyMediaIntent } from "@/features/room/lib/lobby";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { NSFW_LOG_ENABLED } from "@/shared/constants";
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
import type { RoomData } from "@/features/matching/types/room.types";
import {
  isConnectionCallSession,
  isMatchSession,
} from "@/features/room/lib/session/room-session-kind";
import { CALL_ROOM_FORCED_DARK_CLASS } from "@/features/room/constants/call/call-chrome-theme";
import { cn } from "@/lib/utils";

export type InCallContainerProps = {
  roomId: string;
  peerId: string | null;
  scoreLabel: string | null;
  myName: string;
  /** GET `/room/:id` — drives skip / add-to-space / activities by `sessionKind`. */
  room?: RoomData | null;
  isGroupRoom: boolean;
  spaceDisplayTitle: string | null;
  spaceCanEditTitle?: boolean;
  /** DB space host — used for “open circle for everyone” lobby control. */
  spaceHostUserId?: string | null;
  /** From GET `/room/:id` (`sessionKind: circle`). */
  spaceLobbyGateActive?: "0" | "1" | null;
  /** ISO scheduled start from GET room — pre-start lobby (G-Meet–style time line). */
  spaceScheduledStartAt?: string | null;
  /** Postgres circle lifecycle from GET room (`scheduled`, `live`, …). */
  spaceRoomStatus?: string | null;
  /**
   * True for a Postgres circle session: native `circle` **or** a 1:1 match expanded
   * in place (`room_type = circle` on the same `roomId`).
   */
  isDbSpaceCall?: boolean;
};

export function InCallContainer({
  roomId,
  peerId,
  scoreLabel,
  myName,
  room = null,
  isGroupRoom,
  spaceDisplayTitle,
  spaceCanEditTitle = false,
  spaceHostUserId = null,
  spaceLobbyGateActive = null,
  spaceScheduledStartAt = null,
  spaceRoomStatus = null,
  isDbSpaceCall = false,
}: InCallContainerProps) {
  const { leaveAndGoHome } = useRoom();
  const setDirectCallPeerLabel = useRoomStore((s) => s.setDirectCallPeerLabel);
  const { data: session } = useSession();
  const roomPhase = useRoomStore(selectRoomPhase);
  const localLeavePending = useRoomStore(selectLocalLeavePending);
  const activeRealtimeActivity = useRoomActivityStore(selectRoomActiveActivity);
  const [addToSpaceOpen, setAddToSpaceOpen] = useState(false);
  const [embeddedStageActivityId, setEmbeddedStageActivityId] =
    useState<RoomActivityId | null>(null);
  const { mutateAsync: inviteToChess, isPending: requestingChess } = useRoomChessInvite();
  const { mutateAsync: endChess, isPending: endingChess } = useRoomChessEnd();
  const { mutateAsync: offerDraw, isPending: offeringDraw } = useRoomChessDrawOffer();
  const { mutateAsync: openSpaceMeeting, isPending: openingSpaceMeeting } =
    useOpenSpaceMeeting();
  const { mutateAsync: startScheduledSpace, isPending: startingScheduledSpace } =
    useStartScheduledSpace();
  const isMatch = isMatchSession(room);
  const isConnectionCall = isConnectionCallSession(room);
  const canSkipAndRematch =
    isMatch || (roomPhase === "searching" && !isGroupRoom && !isConnectionCall);

  const video = useRoomVideo(roomId, {
    isDbSpaceCall,
    spaceHostUserId,
    canSkipAndRematch,
    isConnectionCallSession: isConnectionCall,
    connectionCallConversationId:
      room?.sessionKind === "connection_call" ? room.conversationId ?? null : null,
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
    dominantSpeakerPeerId: liveSpeakerPeerId,
    dominantSpeakerSpeakingMs: liveSpeakerSpeakingMs,
  } = useRtcSocketContext();

  const mediasoupReady = mediasoupStatus === "ready";
  useCallRenderDebug("InCallContainer", { roomId, mediasoupReady, cameraEnabled, screenSharing });

  const moderationStream = localCompositeStream ?? localMediaStream;

  /** DB-backed tiles + policy map; invite gating uses `embeddedStageActivityId` (can run ahead of Zustand). */
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

  const showAddToSpace = isMatch && !embeddedCallPolicy.blockParticipantInvites;

  const showActivitiesTab =
    isMatch && shouldShowDirectCallActivitiesTab(isGroupRoom, directRoomActivities);

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
        useSpaceGallery: isGroupRoom && remoteParticipants.length + 1 > 6,
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

  const openAddToSpace = useCallback(() => {
    const msg = toastMessageForBlockedInvite(embeddedCallPolicy);
    if (msg) {
      toast.info(msg);
      return;
    }
    setAddToSpaceOpen(true);
  }, [embeddedCallPolicy]);

  const searchingForNextCandidate =
    !localLeavePending &&
    !isGroupRoom &&
    !isConnectionCall &&
    roomPhase === "searching";
  const matchmaking = useMatchmaking();
  const directCallMatchSearchFailed =
    searchingForNextCandidate && matchmaking.status === "error";

  const handleRequestChessInvite = async () => {
    if (isGroupRoom) return;
    try {
      await inviteToChess({ roomId });
      toast.success("Chess invite sent");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Could not send chess invite"));
    }
  };

  const handleEndActiveGame = async () => {
    if (!activeRealtimeActivity || activeRealtimeActivity.kind !== "chess") return;
    try {
      await endChess({ roomId, gameId: activeRealtimeActivity.gameId });
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Could not end chess game"));
    }
  };

  const handleOfferDraw = async () => {
    if (!activeRealtimeActivity || activeRealtimeActivity.kind !== "chess") return;
    try {
      await offerDraw({ roomId, gameId: activeRealtimeActivity.gameId });
      toast.success("Draw offer sent");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Could not send draw offer"));
    }
  };

  const { peerLabel, remotePeerCameraOff, remotePeerMicOff, peerAvatarUrl } = useRemoteParticipantLabel({
    peerId,
    peers,
    isGroupRoom,
  });

  useEffect(() => {
    setDirectCallPeerLabel(isGroupRoom ? null : peerLabel);
  }, [isGroupRoom, peerLabel, setDirectCallPeerLabel]);

  useEffect(() => {
    if (!embeddedCallPolicy.blockParticipantInvites) return;
    const id = requestAnimationFrame(() => setAddToSpaceOpen(false));
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

  /** Keeps lobby visible while room query refetch clears `isError` (avoids flash of the call UI). */
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
    session?.user?.id && spaceHostUserId && session.user.id === spaceHostUserId,
  );
  const guestLobbyWait =
    isGroupRoom && !isHostUser && rtcLobbyGateCode === "LOBBY_WAITING_FOR_HOST";

  const spaceLobbyScheduledNotReady = isGroupRoom && rtcLobbyGateCode === "LOBBY_NOT_READY";

  const rtcLobbyWait = guestLobbyWait || spaceLobbyScheduledNotReady;

  const lobbyPreview = useLobbyPreviewMedia(rtcLobbyWait);

  const hostCanStartScheduledSpaceNow = Boolean(
    isDbSpaceCall &&
      isHostUser &&
      spaceRoomStatus === "scheduled",
  );

  const scheduledLobbyLabel = useMemo(
    () => formatScheduledStart(spaceScheduledStartAt ?? undefined),
    [spaceScheduledStartAt],
  );

  const handleLobbyJoinSpace = useCallback(() => {
    if (
      spaceLobbyScheduledNotReady &&
      isClientStillBeforeScheduledStart(spaceScheduledStartAt) &&
      !isHostUser
    ) {
      const when = scheduledLobbyLabel?.trim();
      toast.error(
        when
          ? `This space hasn’t opened yet. You can join after ${when} (your device time).`
          : "This space hasn’t opened yet — try again after the scheduled start time.",
        { id: `space-lobby-join-${roomId}` },
      );
      return;
    }
    setLobbyMediaIntent({ mic: lobbyPreview.micOn, camera: lobbyPreview.camOn });
    void refetchRtcToken();
  }, [
    spaceLobbyScheduledNotReady,
    spaceScheduledStartAt,
    isHostUser,
    scheduledLobbyLabel,
    lobbyPreview.micOn,
    lobbyPreview.camOn,
    refetchRtcToken,
    roomId,
  ]);

  useEffect(() => {
    if (!rtcLobbyWait) return;
    const id = window.setInterval(() => {
      if (spaceLobbyScheduledNotReady && isClientStillBeforeScheduledStart(spaceScheduledStartAt)) {
        return;
      }
      refetchRtcToken();
    }, 10000);
    return () => window.clearInterval(id);
  }, [rtcLobbyWait, refetchRtcToken, spaceLobbyScheduledNotReady, spaceScheduledStartAt]);

  const handleOpenSpaceMeeting = useCallback(async () => {
    try {
      await openSpaceMeeting(roomId);
      toast.success("Everyone can join the space now.");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Could not open the space for everyone"));
    }
  }, [openSpaceMeeting, roomId]);

  const handleHostStartScheduledSpaceNow = useCallback(async () => {
    try {
      setLobbyMediaIntent({ mic: lobbyPreview.micOn, camera: lobbyPreview.camOn });
      await startScheduledSpace(roomId);
      toast.success("Space is live — connecting you now.");
      void refetchRtcToken();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Could not start the space"));
    }
  }, [
    lobbyPreview.camOn,
    lobbyPreview.micOn,
    refetchRtcToken,
    roomId,
    startScheduledSpace,
  ]);

  return (
    <div className={cn(CALL_ROOM_FORCED_DARK_CLASS, "fixed inset-0 z-100 flex flex-col overflow-hidden bg-background")}>
      <RoomSessionExpiryWarningsLayer roomId={roomId} enabled={mediasoupReady} />
      <SpaceNsfwModerationLayer
        roomId={roomId}
        enabled={NSFW_LOG_ENABLED && isDbSpaceCall}
        localStream={moderationStream}
        mediasoupReady={mediasoupReady}
        cameraEnabled={cameraEnabled}
        screenSharing={screenSharing}
      />
      {rtcLobbyWait ? (
        <SpaceLobbyOverlay
          open
          lobbyPreview={lobbyPreview}
          spaceTitle={spaceDisplayTitle}
          scheduledLabel={scheduledLobbyLabel}
          waitingForScheduledStart={spaceLobbyScheduledNotReady}
          rtcTokenError={rtcTokenError}
          rtcTokenLoading={rtcTokenLoading}
          onJoinSpace={handleLobbyJoinSpace}
          viewerDisplayName={myName}
          hostCanStartScheduledNow={hostCanStartScheduledSpaceNow}
          hostStartScheduledBusy={startingScheduledSpace}
          onHostStartScheduledNow={() => void handleHostStartScheduledSpaceNow()}
          onLeave={leaveAndGoHome}
        />
      ) : null}
      {isGroupRoom && isHostUser && spaceLobbyGateActive === "1" ? (
        <div className="pointer-events-auto absolute top-4 left-1/2 z-[150] flex -translate-x-1/2 justify-center px-4">
          <Button
            type="button"
            size="sm"
            className="shadow-md"
            disabled={openingSpaceMeeting}
            onClick={() => void handleOpenSpaceMeeting()}
          >
            {openingSpaceMeeting ? "Starting…" : "Open space for everyone"}
          </Button>
        </div>
      ) : null}
      <AddToSpaceDialog
        open={addToSpaceOpen}
        onOpenChange={setAddToSpaceOpen}
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
        showSkip={isMatch || (roomPhase === "searching" && !isGroupRoom)}
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
        directRemotePeerUserId={peerId}
        scoreLabel={scoreLabel}
        myName={myName}
        currentUserId={session?.user?.id ?? null}
        myAvatarUrl={session?.user?.image ?? null}
        peerAvatarUrl={peerAvatarUrl}
        remotePeerCameraOff={remotePeerCameraOff}
        remotePeerMicOff={remotePeerMicOff}
        conversationId={roomConversationId}
        showAddToSpace={showAddToSpace}
        onOpenAddToSpace={openAddToSpace}
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
        spaceDisplayTitle={spaceDisplayTitle}
        spaceCanEditTitle={spaceCanEditTitle}
        onHostEndSpaceForEveryone={
          isDbSpaceCall && video.isSpaceHost
            ? video.handleHostEndSpaceForEveryone
            : undefined
        }
        onKickParticipant={video.handleKickParticipant}
        kickingUserId={video.kickingUserId}
        isSpaceHost={video.isSpaceHost}
        screenShareTiles={screenShareTiles}
        focusedScreenShareKey={focusedScreenShareKey}
        onSelectScreenShare={setFocusedScreenShareKey}
        remoteTrackMediaSource={remoteTrackMediaSource}
        onEmbeddedStageActivityChange={setEmbeddedStageActivityId}
        directRoomActivities={directRoomActivities}
        embeddedCallPolicyLookup={embeddedCallPolicyLookup}
        liveSpeakerPeerId={liveSpeakerPeerId}
        liveSpeakerSpeakingMs={liveSpeakerSpeakingMs}
        callCapabilities={callCapabilities}
      />
    </div>
  );
}
