"use client";

import { useCallback } from "react";
import type { Producer, Transport } from "mediasoup-client/types";
import { formatGetUserMediaError } from "@/features/rtc/lib/get-user-media-errors";
import {
  appendTrack,
  mergeLocalCameraTrack,
  mergeLocalTrack,
  rebuildLocalStreamWithoutCameraVideo,
  rebuildLocalStreamWithoutKind,
} from "@/features/rtc/lib/mediasoup-stream-helpers";
import { canUseScreenShare } from "@/features/rtc/lib/screen-share-policy";
import { emitRtcAck, isAckErr, isAckOk } from "@/features/rtc/lib/rtc-signaling";
import type { SimpleAck } from "@/features/rtc/types/mediasoup-room.types";
import type {
  MediasoupLocalMediaRefs,
  MediasoupLocalMediaSetters,
} from "@/features/rtc/types/mediasoup-hooks.types";

const CAMERA_VIDEO = {
  facingMode: "user" as const,
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

const SCREEN_VIDEO = {
  frameRate: { ideal: 30 },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

/**
 * Mic, camera, and screen-share: pause/resume, first-time `getUserMedia` / `getDisplayMedia`, and produce.
 * Expects {@link useMediasoupRoomSession} to have opened the send transport first.
 */
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
    screenProducerRef,
    screenShareProducerIdRef,
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

  const cleanupLocalScreenShare = useCallback(() => {
    setLocalMediaDeviceError(null);
    const screenPid = screenShareProducerIdRef.current;
    try {
      screenProducerRef.current?.close();
    } catch {
      /* ignore */
    }
    screenProducerRef.current = null;
    screenShareProducerIdRef.current = null;
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
    if (screenPid && sock) {
      void emitRtcAck<SimpleAck>(sock, "closeProducer", { producerId: screenPid })
        .then((r) => {
          if (!isAckOk(r)) {
            console.warn("[RTC] closeProducer ack", isAckErr(r) ? r.error?.code : "nack");
          }
        })
        .catch((e) => {
          console.warn("[RTC] closeProducer", e);
        });
    }
  }, [
    localScreenTrackRef,
    localStreamRef,
    screenProducerRef,
    screenShareProducerIdRef,
    setLocalMediaDeviceError,
    setLocalScreenTrackId,
    setLocalStream,
    setScreenSharing,
    socketRef,
  ]);

  const toggleMic = useCallback(() => {
    if (statusRef.current !== "ready") return;
    void (async () => {
      const send = sendTransportRef.current;
      const device = deviceRef.current;
      if (!send || !device) return;

      if (micEnabledRef.current) {
        setLocalMediaDeviceError(null);
        const producerId = audioProducerRef.current?.id;
        try {
          audioProducerRef.current?.pause();
        } catch {
          /* ignore */
        }
        localStreamRef.current?.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
        setMicEnabled(false);
        micEnabledRef.current = false;
        // Signal peers that our mic is muted.
        const sock = socketRef.current;
        if (producerId && sock) {
          void emitRtcAck<SimpleAck>(sock, "pauseProducer", { producerId }).catch(() => {});
        }
        return;
      }

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
          localStreamRef.current?.getAudioTracks().forEach((t) => {
            t.enabled = true;
          });
          setMicEnabled(true);
          micEnabledRef.current = true;
          // Signal peers that our mic is back on.
          const sock = socketRef.current;
          if (sock) {
            void emitRtcAck<SimpleAck>(sock, "resumeProducer", { producerId }).catch(() => {});
          }
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

      if (!device.canProduce("audio") || acquiringMicRef.current) return;
      acquiringMicRef.current = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (statusRef.current !== "ready") {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const track = stream.getAudioTracks()[0];
        if (!track) {
          stream.getTracks().forEach((t) => t.stop());
          setLocalMediaDeviceError("No microphone track available.");
          return;
        }
        const producer = await send.produce({ track });
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
    setLocalMediaDeviceError,
    setLocalStream,
    setMicEnabled,
    statusRef,
  ]);

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
        // Signal peers that our camera is off.
        const sock = socketRef.current;
        if (producerId && sock) {
          void emitRtcAck<SimpleAck>(sock, "pauseProducer", { producerId }).catch(() => {});
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
          // Signal peers that our camera is back on.
          const sock = socketRef.current;
          if (sock) {
            void emitRtcAck<SimpleAck>(sock, "resumeProducer", { producerId }).catch(() => {});
          }
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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: CAMERA_VIDEO,
        });
        if (statusRef.current !== "ready") {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const track = stream.getVideoTracks()[0];
        if (!track) {
          stream.getTracks().forEach((t) => t.stop());
          setLocalMediaDeviceError("No camera track available.");
          return;
        }
        const producer = await send.produce({
          track,
          appData: { mediaSource: "camera" },
        });
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
    setLocalMediaDeviceError,
    setLocalStream,
    setCameraEnabled,
    statusRef,
    videoProducerRef,
  ]);

  const toggleScreenShare = useCallback(() => {
    if (statusRef.current !== "ready") return;
    if (!canUseScreenShare(rtcRoomTypeRef.current)) return;

    void (async () => {
      const send = sendTransportRef.current;
      const device = deviceRef.current;
      if (!send || !device) return;

      if (screenProducerRef.current || localScreenTrackRef.current) {
        cleanupLocalScreenShare();
        return;
      }

      if (!device.canProduce("video") || acquiringScreenRef.current) return;
      acquiringScreenRef.current = true;
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: SCREEN_VIDEO,
          audio: false,
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

        const producer = await send.produce({
          track,
          appData: { mediaSource: "screen" },
        });
        screenProducerRef.current = producer;
        screenShareProducerIdRef.current = producer.id;
        localScreenTrackRef.current = track;
        setLocalScreenTrackId(track.id);
        setScreenSharing(true);
        const merged = appendTrack(localStreamRef.current, track);
        localStreamRef.current = merged;
        setLocalStream(merged);
        setLocalMediaDeviceError(null);

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
    screenProducerRef,
    screenShareProducerIdRef,
    sendTransportRef,
    setLocalMediaDeviceError,
    setLocalScreenTrackId,
    setLocalStream,
    setScreenSharing,
    statusRef,
  ]);

  return { toggleMic, toggleCamera, toggleScreenShare, cleanupLocalScreenShare };
}
