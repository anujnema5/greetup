"use client";

/**
 * Computes main + side-strip streams for {@link MinimizedRoomDock} when not mirroring the full
 * room compositor 1:1. Screen-share stages still use {@link remoteMediaStream} from RTC context
 * so focus ordering matches the big stage.
 *
 * Policy: pin (Redux) → debounced dominant → silence sticky → first remote. See
 * `docs/design/minimized-room-dock-plan.md`.
 *
 * Direct (1:1) uses the same stack as circle (dominant when not pinned). An “always show remote”
 * shortcut would simplify tile changes but was intentionally not applied so behavior matches group calls.
 *
 * Dominant / silence: {@link minimizedDockSilenceReducer} — one batched update per `dominantSpeakerPeerId`
 * change (microtask), plus a sticky timer. Debounce stays separate (delayed `setTimeout`).
 */
import { useEffect, useMemo, useReducer, useState } from "react";
import { hasLiveEnabledVideo, hasLiveMedia, hasLiveVideo } from "@/features/rtc";
import type {
  MinimizedDockMainStage,
  UseMinimizedDockMainStageArgs,
} from "@/features/room/types/minimized-dock-main-stage.types";
import {
  firstRemoteParticipantExcluding,
  MINIMIZED_DOCK_DOMINANT_DEBOUNCE_MS,
  MINIMIZED_DOCK_SILENCE_STICKY_MS,
  peerDisplayLabel,
  playbackStreamForDockVideo,
  resolveFocusedRemoteParticipant,
} from "@/features/room/lib/minimized-dock-focus";
import {
  initialMinimizedDockSilenceState,
  minimizedDockSilenceReducer,
} from "@/features/room/lib/minimized-dock-main-stage-silence";

export function useMinimizedDockMainStage({
  mainStageShowsScreen,
  remoteMediaStream,
  remoteParticipants,
  remoteTrackMediaSource,
  dominantSpeakerPeerId,
  rtcPrimaryRemoteUserId,
  currentUserId,
  localMediaStream,
  directCallPeerLabel,
}: UseMinimizedDockMainStageArgs): MinimizedDockMainStage {
  const pinned = rtcPrimaryRemoteUserId;
  const uid = currentUserId ?? null;

  const [silence, dispatchSilence] = useReducer(
    minimizedDockSilenceReducer,
    initialMinimizedDockSilenceState,
  );

  useEffect(() => {
    queueMicrotask(() => {
      dispatchSilence({ type: "apply_dominant", peerId: dominantSpeakerPeerId });
    });
  }, [dominantSpeakerPeerId]);

  useEffect(() => {
    if (silence.silenceStartedAt === null) return;
    const t = window.setTimeout(() => {
      dispatchSilence({ type: "sticky_timer_fire" });
    }, MINIMIZED_DOCK_SILENCE_STICKY_MS);
    return () => window.clearTimeout(t);
  }, [silence.silenceStartedAt]);

  const [debouncedDominant, setDebouncedDominant] = useState<string | null>(null);
  useEffect(() => {
    if (pinned) return;
    if (dominantSpeakerPeerId === null) {
      queueMicrotask(() => setDebouncedDominant(null));
      return;
    }
    const t = window.setTimeout(() => {
      setDebouncedDominant(dominantSpeakerPeerId);
    }, MINIMIZED_DOCK_DOMINANT_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [dominantSpeakerPeerId, pinned]);

  const dominantBackedPeerId = useMemo(() => {
    if (pinned) return null;
    if (dominantSpeakerPeerId !== null) {
      return debouncedDominant ?? dominantSpeakerPeerId;
    }
    if (
      silence.silenceStartedAt !== null &&
      silence.lastNonNullDominant !== null &&
      silence.silenceStickyLive
    ) {
      return silence.lastNonNullDominant;
    }
    return null;
  }, [pinned, dominantSpeakerPeerId, debouncedDominant, silence]);

  const dockFocusPeerId = useMemo(() => {
    if (pinned) return pinned;
    if (dominantBackedPeerId) return dominantBackedPeerId;
    return remoteParticipants[0]?.peer.peerId ?? null;
  }, [pinned, dominantBackedPeerId, remoteParticipants]);

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
          videoLive: hasLiveEnabledVideo(localMediaStream),
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
    const singleRemoteParty = remoteParticipants.length <= 1 && Boolean(remoteMediaStream);
    const remoteSourceForMain = mainIsLocal
      ? null
      : singleRemoteParty
        ? remoteMediaStream
        : (mainParticipant?.stream ?? remoteMediaStream);

    const mainStream = mainIsLocal
      ? localMediaStream
      : playbackStreamForDockVideo(remoteSourceForMain, remoteTrackMediaSource);

    const mainVideoLive = mainIsLocal
      ? hasLiveEnabledVideo(mainStream)
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
    uid,
    dockFocusPeerId,
    directCallPeerLabel,
  ]);
}
