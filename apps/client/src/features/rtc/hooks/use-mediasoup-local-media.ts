"use client";

/**
 * Local media for mediasoup: mic, camera, screen share.
 *
 * Flow:
 * 1. `useMediasoupRoomSession` opens the send transport and joins the room.
 * 2. This hook toggles tracks: pause/resume, first `getUserMedia` / `getDisplayMedia`, then `produce`.
 * 3. Signaling (`pauseProducer` / `resumeProducer` / `closeProducer`) keeps remote UIs in sync.
 *
 * Capture tuning: `lib/mediasoup-local-capture-constraints.ts` (resolution / fps).
 * Outbound layers: `lib/mediasoup-produce-config.ts` (simulcast + fallbacks).
 */

import { useCallback } from "react";
import type { Producer, Transport } from "mediasoup-client/types";
import type { Socket } from "socket.io-client";
import { formatGetUserMediaError } from "@/features/rtc/lib/get-user-media-errors";
import {
  getCameraCaptureConstraints,
  getScreenCaptureConstraints,
} from "@/features/rtc/lib/mediasoup-local-capture-constraints";
import {
  appendTrack,
  mergeLocalCameraTrack,
  mergeLocalTrack,
  rebuildLocalStreamWithoutCameraVideo,
  rebuildLocalStreamWithoutKind,
} from "@/features/rtc/lib/mediasoup-stream-helpers";
import {
  cameraSimulcastEncodingsForDevice,
  produceOutboundVideo,
  screenVideoEncodingsForDevice,
  setVideoTrackContentHint,
} from "@/features/rtc/lib/mediasoup-produce-config";
import { canUseScreenShare } from "@/features/rtc/lib/screen-share-policy";
import { emitRtcAck, isAckErr, isAckOk } from "@/features/rtc/lib/rtc-signaling";
import { takeLobbyHandoffAudio, takeLobbyHandoffVideo } from "@/features/room/lib/lobby";
import type { SimpleAck } from "@/features/rtc/types/mediasoup-room.types";
import type {
  MediasoupLocalMediaRefs,
  MediasoupLocalMediaSetters,
} from "@/features/rtc/types/mediasoup-hooks.types";

function setTracksEnabled(tracks: MediaStreamTrack[], enabled: boolean): void {
  tracks.forEach((track) => {
    track.enabled = enabled;
  });
}

function signalProducer(
  socket: Socket | null,
  event: "pauseProducer" | "resumeProducer" | "closeProducer",
  producerId: string,
  context: string,
): void {
  if (!socket || !producerId) return;
  void emitRtcAck<SimpleAck>(socket, event, { producerId })
    .then((ack) => {
      if (!isAckOk(ack)) {
        console.warn(`[RTC] ${context} ack`, isAckErr(ack) ? ack.error?.code : "nack");
      }
    })
    .catch((err) => {
      console.warn(`[RTC] ${context}`, err);
    });
}

export function useMediasoupLocalMedia(
  refs: MediasoupLocalMediaRefs,
  setters: MediasoupLocalMediaSetters,
): {
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  cleanupLocalScreenShare: () => void;
} {
  const {
    statusRef,
    sendTransportRef,
    deviceRef,
    localStreamRef,
    videoProducerRef,
    screenVideoProducerRef,
    screenVideoProducerIdRef,
    screenAudioProducerRef,
    screenAudioProducerIdRef,
    localScreenTrackRef,
    audioProducerRef,
    socketRef,
    micEnabledRef,
    cameraEnabledRef,
    acquiringMicRef,
    acquiringCameraRef,
    acquiringScreenRef,
    rtcRoomTypeRef,
  } = refs;

  const {
    setLocalStream,
    setMicEnabled,
    setCameraEnabled,
    setScreenSharing,
    setLocalScreenTrackId,
    setLocalMediaDeviceError,
  } = setters;

  // ─── Screen share teardown (track + producer + server closeProducer) ─────

  const cleanupLocalScreenShare = useCallback(() => {
    setLocalMediaDeviceError(null);
    const screenPid = screenVideoProducerIdRef.current;
    const screenAudioPid = screenAudioProducerIdRef.current;
    try {
      screenVideoProducerRef.current?.close();
    } catch {
      /* ignore */
    }
    try {
      screenAudioProducerRef.current?.track?.stop();
      screenAudioProducerRef.current?.close();
    } catch {
      /* ignore */
    }
    screenVideoProducerRef.current = null;
    screenVideoProducerIdRef.current = null;
    screenAudioProducerRef.current = null;
    screenAudioProducerIdRef.current = null;
    const screenTrack = localScreenTrackRef.current;
    localScreenTrackRef.current = null;
    setLocalScreenTrackId(null);
    setScreenSharing(false);
    if (screenTrack && localStreamRef.current) {
      try {
        screenTrack.stop();
      } catch {
        /* ignore */
      }
      const nextTracks = localStreamRef.current.getTracks().filter((t) => t !== screenTrack);
      const next = nextTracks.length > 0 ? new MediaStream(nextTracks) : null;
      localStreamRef.current = next;
      setLocalStream(next);
    }
    const sock = socketRef.current;
    signalProducer(sock, "closeProducer", screenPid ?? "", "closeProducer");
    if (screenAudioPid) {
      signalProducer(sock, "closeProducer", screenAudioPid, "closeProducer screenAudio");
    }
  }, [
    localScreenTrackRef,
    localStreamRef,
    screenVideoProducerRef,
    screenVideoProducerIdRef,
    screenAudioProducerRef,
    screenAudioProducerIdRef,
    setLocalMediaDeviceError,
    setLocalScreenTrackId,
    setLocalStream,
    setScreenSharing,
    socketRef,
  ]);

  // ─── Microphone ────────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    if (statusRef.current !== "ready") return;
    void (async () => {
      const send = sendTransportRef.current;
      const device = deviceRef.current;
      if (!send || !device) return;

      // Turn off: pause producer + disable local track + tell SFU (remote tiles show “muted”).
      if (micEnabledRef.current) {
        setLocalMediaDeviceError(null);
        const producerId = audioProducerRef.current?.id;
        try {
          audioProducerRef.current?.pause();
        } catch {
          /* ignore */
        }
        setTracksEnabled(localStreamRef.current?.getAudioTracks() ?? [], false);
        setMicEnabled(false);
        micEnabledRef.current = false;
        signalProducer(socketRef.current, "pauseProducer", producerId ?? "", "pauseProducer");
        return;
      }

      // Turn on: resume existing producer if track still alive.
      const existing = audioProducerRef.current;
      if (existing) {
        const tr = existing.track;
        if (tr && tr.readyState !== "ended") {
          setLocalMediaDeviceError(null);
          const producerId = existing.id;
          try {
            existing.resume();
          } catch {
            /* ignore */
          }
          setTracksEnabled(localStreamRef.current?.getAudioTracks() ?? [], true);
          setMicEnabled(true);
          micEnabledRef.current = true;
          signalProducer(socketRef.current, "resumeProducer", producerId, "resumeProducer");
          return;
        }
        try {
          existing.close();
        } catch {
          /* ignore */
        }
        audioProducerRef.current = null;
        const withoutAudio = rebuildLocalStreamWithoutKind(localStreamRef.current, "audio");
        localStreamRef.current = withoutAudio;
        setLocalStream(withoutAudio);
      }

      // First open: new mic track + produce (Opus options align with router codec).
      if (!device.canProduce("audio") || acquiringMicRef.current) return;
      acquiringMicRef.current = true;
      try {
        const handoffAudio = takeLobbyHandoffAudio();
        let track: MediaStreamTrack | undefined = handoffAudio?.readyState === "live" ? handoffAudio : undefined;
        if (!track) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          if (statusRef.current !== "ready") {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          track = stream.getAudioTracks()[0];
          stream.getVideoTracks().forEach((t) => t.stop());
        }
        if (!track) {
          setLocalMediaDeviceError("No microphone track available.");
          return;
        }
        const producer = await send.produce({
          track,
          codecOptions: {
            opusStereo: true,
            opusDtx: true,
            opusFec: true,
          },
        });
        audioProducerRef.current = producer;
        const merged = mergeLocalTrack(localStreamRef.current, track, "audio");
        localStreamRef.current = merged;
        setLocalStream(merged);
        setMicEnabled(true);
        micEnabledRef.current = true;
        setLocalMediaDeviceError(null);
      } catch (e) {
        setLocalMediaDeviceError(formatGetUserMediaError(e, "microphone"));
      } finally {
        acquiringMicRef.current = false;
      }
    })();
  }, [
    acquiringMicRef,
    audioProducerRef,
    deviceRef,
    localStreamRef,
    micEnabledRef,
    sendTransportRef,
    socketRef,
    setLocalMediaDeviceError,
    setLocalStream,
    setMicEnabled,
    statusRef,
  ]);

  // ─── Camera ────────────────────────────────────────────────────────────────

  const toggleCamera = useCallback(() => {
    if (statusRef.current !== "ready") return;
    void (async () => {
      const send = sendTransportRef.current;
      const device = deviceRef.current;
      if (!send || !device) return;

      if (cameraEnabledRef.current) {
        setLocalMediaDeviceError(null);
        const producerId = videoProducerRef.current?.id;
        try {
          videoProducerRef.current?.pause();
        } catch {
          /* ignore */
        }
        const cam = videoProducerRef.current?.track;
        if (cam) cam.enabled = false;
        setCameraEnabled(false);
        cameraEnabledRef.current = false;
        const sock = socketRef.current;
        if (producerId && sock) {
          signalProducer(sock, "pauseProducer", producerId, "pauseProducer");
        }
        return;
      }

      const existing = videoProducerRef.current;
      if (existing) {
        const tr = existing.track;
        if (tr && tr.readyState !== "ended") {
          setLocalMediaDeviceError(null);
          const producerId = existing.id;
          try {
            existing.resume();
          } catch {
            /* ignore */
          }
          tr.enabled = true;
          setCameraEnabled(true);
          cameraEnabledRef.current = true;
          signalProducer(socketRef.current, "resumeProducer", producerId, "resumeProducer");
          return;
        }
        try {
          existing.close();
        } catch {
          /* ignore */
        }
        videoProducerRef.current = null;
        const withoutVideo = rebuildLocalStreamWithoutCameraVideo(
          localStreamRef.current,
          localScreenTrackRef.current,
        );
        localStreamRef.current = withoutVideo;
        setLocalStream(withoutVideo);
      }

      if (!device.canProduce("video") || acquiringCameraRef.current) return;
      acquiringCameraRef.current = true;
      try {
        const handoffVideo = takeLobbyHandoffVideo();
        let track: MediaStreamTrack | undefined =
          handoffVideo?.readyState === "live" ? handoffVideo : undefined;
        if (!track) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: getCameraCaptureConstraints(),
          });
          if (statusRef.current !== "ready") {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          track = stream.getVideoTracks()[0];
          stream.getAudioTracks().forEach((t) => t.stop());
        }
        if (!track) {
          setLocalMediaDeviceError("No camera track available.");
          return;
        }
        setVideoTrackContentHint(track, "motion");
        const producer = await produceOutboundVideo(
          send,
          track,
          { mediaSource: "camera" },
          cameraSimulcastEncodingsForDevice(),
        );
        videoProducerRef.current = producer;
        const merged = mergeLocalCameraTrack(
          localStreamRef.current,
          track,
          localScreenTrackRef.current,
        );
        localStreamRef.current = merged;
        setLocalStream(merged);
        setCameraEnabled(true);
        cameraEnabledRef.current = true;
        setLocalMediaDeviceError(null);
      } catch (e) {
        setLocalMediaDeviceError(formatGetUserMediaError(e, "camera"));
      } finally {
        acquiringCameraRef.current = false;
      }
    })();
  }, [
    acquiringCameraRef,
    cameraEnabledRef,
    deviceRef,
    localScreenTrackRef,
    localStreamRef,
    sendTransportRef,
    socketRef,
    setLocalMediaDeviceError,
    setLocalStream,
    setCameraEnabled,
    statusRef,
    videoProducerRef,
  ]);

  // ─── Screen share (room policy + display capture) ─────────────────────────

  const toggleScreenShare = useCallback(() => {
    if (statusRef.current !== "ready") return;
    if (!canUseScreenShare(rtcRoomTypeRef.current)) return;

    void (async () => {
      const send = sendTransportRef.current;
      const device = deviceRef.current;
      if (!send || !device) return;

      if (screenVideoProducerRef.current || localScreenTrackRef.current) {
        cleanupLocalScreenShare();
        return;
      }

      if (!device.canProduce("video") || acquiringScreenRef.current) return;
      acquiringScreenRef.current = true;
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: getScreenCaptureConstraints(),
          audio: true,
        });
        if (statusRef.current !== "ready") {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const track = stream.getVideoTracks()[0];
        if (!track) {
          stream.getTracks().forEach((t) => t.stop());
          setLocalMediaDeviceError("No screen track available.");
          return;
        }

        setVideoTrackContentHint(track, "detail");
        const producer = await produceOutboundVideo(
          send,
          track,
          { mediaSource: "screen" },
          screenVideoEncodingsForDevice(),
        );
        screenVideoProducerRef.current = producer;
        screenVideoProducerIdRef.current = producer.id;
        localScreenTrackRef.current = track;
        setLocalScreenTrackId(track.id);
        setScreenSharing(true);
        const merged = appendTrack(localStreamRef.current, track);
        localStreamRef.current = merged;
        setLocalStream(merged);
        setLocalMediaDeviceError(null);

        // Produce system audio if the browser captured it (optional — user may decline).
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack && device.canProduce("audio")) {
          try {
            const audioProducer = await send.produce({
              track: audioTrack,
              codecOptions: { opusStereo: true, opusDtx: true, opusFec: true },
              appData: { mediaSource: "screen" },
            });
            screenAudioProducerRef.current = audioProducer;
            screenAudioProducerIdRef.current = audioProducer.id;
          } catch {
            audioTrack.stop();
          }
        }

        track.addEventListener("ended", () => {
          if (localScreenTrackRef.current !== track) return;
          cleanupLocalScreenShare();
        });
      } catch (e) {
        setLocalMediaDeviceError(formatGetUserMediaError(e, "screen"));
      } finally {
        acquiringScreenRef.current = false;
      }
    })();
  }, [
    acquiringScreenRef,
    cleanupLocalScreenShare,
    deviceRef,
    localScreenTrackRef,
    localStreamRef,
    rtcRoomTypeRef,
    screenVideoProducerRef,
    screenVideoProducerIdRef,
    screenAudioProducerRef,
    screenAudioProducerIdRef,
    sendTransportRef,
    setLocalMediaDeviceError,
    setLocalScreenTrackId,
    setLocalStream,
    setScreenSharing,
    statusRef,
  ]);

  return { toggleMic, toggleCamera, toggleScreenShare, cleanupLocalScreenShare };
}
