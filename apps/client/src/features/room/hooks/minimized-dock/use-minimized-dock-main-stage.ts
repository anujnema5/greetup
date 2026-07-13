"use client";

/**
 * Computes main + side-strip streams for {@link MinimizedRoomDock} when not mirroring the full
 * room compositor 1:1. Screen-share stages still use {@link remoteMediaStream} from RTC context
 * so focus ordering matches the big stage.
 *
 * Policy: pin (room store) → debounced live speaker → last speaker (while still in roster) → first remote.
 *
 * Direct (1:1) uses the same stack as circle (live speaker when not pinned).
 *
 * Live-speaker history: {@link minimizedDockSilenceReducer} — last non-null rtc speaker (silence does
 * not clear it). Debounce stays separate (delayed `setTimeout`).
 */
import { isGroupRoomSessionType } from "@/shared/types/room-session";
import { useEffect, useMemo, useReducer, useState } from "react";
import { hasLiveEnabledVideo, hasLiveMedia, hasLiveVideo } from "@/features/rtc";
import type {
  MinimizedDockMainStage,
  UseMinimizedDockMainStageArgs,
} from "@/features/room/types/minimized-dock/minimized-dock-main-stage.types";
import {
  firstRemoteParticipantExcluding,
  MINIMIZED_DOCK_LIVE_SPEAKER_DEBOUNCE_MS,
  peerDisplayLabel,
  playbackStreamForDockVideo,
  resolveFocusedRemoteParticipant,
} from "@/features/room/lib/minimized-dock/minimized-dock-focus";
import {
  initialMinimizedDockSilenceState,
  minimizedDockSilenceReducer,
} from "@/features/room/lib/minimized-dock/minimized-dock-main-stage-silence";

export function useMinimizedDockMainStage({
  mainStageShowsScreen,
  remoteMediaStream,
  remoteParticipants,
  remoteTrackMediaSource,
  liveSpeakerPeerId,
  rtcRoomType,
  rtcPrimaryRemoteUserId,
  currentUserId,
  localMediaStream,
  cameraEnabled,
  directCallPeerLabel,
}: UseMinimizedDockMainStageArgs): MinimizedDockMainStage {
  const isSpaceRoom = isGroupRoomSessionType(rtcRoomType);
  const pinned = isSpaceRoom ? null : rtcPrimaryRemoteUserId;
  const uid = currentUserId ?? null;

  const [silence, dispatchSilence] = useReducer(
    minimizedDockSilenceReducer,
    initialMinimizedDockSilenceState,
  );

  useEffect(() => {
    queueMicrotask(() => {
      dispatchSilence({ type: "apply_live_speaker", peerId: liveSpeakerPeerId });
    });
  }, [liveSpeakerPeerId]);

  const [debouncedLiveSpeakerPeerId, setDebouncedLiveSpeakerPeerId] = useState<string | null>(null);
  useEffect(() => {
    if (pinned) return;
    if (liveSpeakerPeerId === null) {
      queueMicrotask(() => setDebouncedLiveSpeakerPeerId(null));
      return;
    }
    const t = window.setTimeout(() => {
      setDebouncedLiveSpeakerPeerId(liveSpeakerPeerId);
    }, MINIMIZED_DOCK_LIVE_SPEAKER_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [liveSpeakerPeerId, pinned]);

  const liveSpeakerBackedPeerId = useMemo(() => {
    if (pinned) return null;
    if (liveSpeakerPeerId !== null) {
      return debouncedLiveSpeakerPeerId ?? liveSpeakerPeerId;
    }
    const last = silence.lastLiveSpeakerPeerId;
    if (last !== null && remoteParticipants.some((p) => p.peer.peerId === last)) {
      return last;
    }
    return null;
  }, [pinned, liveSpeakerPeerId, debouncedLiveSpeakerPeerId, silence, remoteParticipants]);

  const dockFocusPeerId = useMemo(() => {
    if (pinned) return pinned;
    if (liveSpeakerBackedPeerId) return liveSpeakerBackedPeerId;
    return remoteParticipants[0]?.peer.peerId ?? null;
  }, [pinned, liveSpeakerBackedPeerId, remoteParticipants]);

  return useMemo(() => {
    if (mainStageShowsScreen) {
      const remoteLive = hasLiveVideo(remoteMediaStream);
      const single = remoteParticipants.length === 1 ? remoteParticipants[0]! : null;
      const header =
        directCallPeerLabel?.trim() ||
        (single ? peerDisplayLabel(single.peer.peerId, single) : null) ||
        "Screen share";

      return {
        mainStream: remoteMediaStream,
        mainVideoLive: remoteLive,
        mainHasPlayableMedia: hasLiveMedia(remoteMediaStream),
        mainVideoMuted: false,
        mainStageShowsScreen: true,
        headerLabel: header,
        stageBadge: "sharing" as const,
        sideStrip: {
          stream: localMediaStream,
          videoLive: Boolean(cameraEnabled && hasLiveEnabledVideo(localMediaStream)),
          label: "You",
          mirrorVideo: true,
          remotePeer: null,
        },
        mainFocusPeerId: dockFocusPeerId,
        mainParticipant: resolveFocusedRemoteParticipant(remoteParticipants, dockFocusPeerId, uid),
      };
    }

    const mainIsLocal = Boolean(uid && dockFocusPeerId === uid);

    const mainParticipant = mainIsLocal
      ? null
      : resolveFocusedRemoteParticipant(remoteParticipants, dockFocusPeerId, uid);

    /**
     * With 0–1 remote members in the roster, `remoteMediaStream` is the same primary-stage composite
     * the big room uses (direct or two-party circle). Otherwise pick the focused peer’s bucket.
     * Always run {@link playbackStreamForDockVideo} so we never bind multiple video tracks to one element.
     */
    const singleRemoteParty =
      !isSpaceRoom && remoteParticipants.length <= 1 && Boolean(remoteMediaStream);
    const remoteSourceForMain = mainIsLocal
      ? null
      : singleRemoteParty
        ? remoteMediaStream
        : (mainParticipant?.stream ?? remoteMediaStream);

    const mainStream = mainIsLocal
      ? localMediaStream
      : playbackStreamForDockVideo(remoteSourceForMain, remoteTrackMediaSource);

    const mainVideoLive = mainIsLocal
      ? Boolean(cameraEnabled && hasLiveEnabledVideo(mainStream))
      : Boolean(
          hasLiveVideo(mainStream) &&
            (mainParticipant ? mainParticipant.peer.cameraActive !== false : true),
        );

    let headerLabel: string;
    if (mainIsLocal) {
      headerLabel = "You";
    } else if (mainParticipant) {
      headerLabel = peerDisplayLabel(mainParticipant.peer.peerId, mainParticipant);
    } else {
      headerLabel = directCallPeerLabel?.trim() || "Call";
    }

    const sideRemote = mainIsLocal
      ? firstRemoteParticipantExcluding(remoteParticipants, uid)
      : null;

    const sideStrip = mainIsLocal
      ? {
          stream: playbackStreamForDockVideo(
            singleRemoteParty ? remoteMediaStream : (sideRemote?.stream ?? null),
            remoteTrackMediaSource,
          ),
          videoLive: Boolean(
            (() => {
              const raw = singleRemoteParty ? remoteMediaStream : sideRemote?.stream;
              if (!raw || !hasLiveVideo(raw)) return false;
              return sideRemote ? sideRemote.peer.cameraActive !== false : true;
            })(),
          ),
          label: sideRemote ? peerDisplayLabel(sideRemote.peer.peerId, sideRemote) : "—",
          mirrorVideo: false as boolean,
          remotePeer: sideRemote ?? null,
        }
      : {
          stream: localMediaStream,
          videoLive: hasLiveEnabledVideo(localMediaStream),
          label: "You",
          mirrorVideo: true,
          remotePeer: null,
        };

    return {
      mainStream,
      mainVideoLive,
      mainHasPlayableMedia: hasLiveMedia(mainStream),
      mainVideoMuted: mainIsLocal,
      mainStageShowsScreen: false,
      headerLabel,
      stageBadge: "video" as const,
      sideStrip,
      mainFocusPeerId: dockFocusPeerId,
      mainParticipant,
    };
  }, [
    mainStageShowsScreen,
    remoteMediaStream,
    remoteParticipants,
    remoteTrackMediaSource,
    localMediaStream,
    cameraEnabled,
    uid,
    dockFocusPeerId,
    directCallPeerLabel,
    isSpaceRoom,
  ]);
}
