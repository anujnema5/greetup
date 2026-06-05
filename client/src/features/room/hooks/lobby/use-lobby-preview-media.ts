"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCameraCaptureConstraints } from "@/features/rtc/lib/mediasoup-local-capture-constraints";
import {
  peekLobbyMediaHandoff,
  registerLobbyMediaHandoff,
  setLobbyMediaIntent,
} from "@/features/room/lib/lobby";

type Acquiring = "mic" | "cam" | null;

function stopTracks(stream: MediaStream | null, kind?: "audio" | "video") {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    if (!kind || track.kind === kind) track.stop();
  }
}

function streamWithoutKind(stream: MediaStream, kind: "audio" | "video"): MediaStream | null {
  const tracks = stream.getTracks().filter((t) => t.kind !== kind);
  if (tracks.length === 0) return null;
  return new MediaStream(tracks);
}

export type LobbyPreviewMedia = ReturnType<typeof useLobbyPreviewMedia>;

/**
 * Local camera + mic preview while waiting on RTC (e.g. scheduled circle lobby).
 * Devices stay off until the user turns them on (browser permission prompt on enable only).
 * Stops all tracks when `enabled` becomes false.
 */
export function useLobbyPreviewMedia(enabled: boolean) {
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [acquiring, setAcquiring] = useState<Acquiring>(null);
  const enabledRef = useRef(enabled);
  const wasEnabledRef = useRef(false);
  const micOnRef = useRef(false);
  const camOnRef = useRef(false);
  const previewStreamRef = useRef<MediaStream | null>(null);

  enabledRef.current = enabled;
  micOnRef.current = micOn;
  camOnRef.current = camOn;
  previewStreamRef.current = previewStream;

  useEffect(() => {
    if (enabled) {
      wasEnabledRef.current = true;
      return;
    }
    if (wasEnabledRef.current) {
      const intent = { mic: micOnRef.current, camera: camOnRef.current };
      setLobbyMediaIntent(intent);
      const stream = previewStreamRef.current;
      registerLobbyMediaHandoff({
        audio: intent.mic
          ? stream?.getAudioTracks().find((t) => t.readyState === "live")
          : undefined,
        video: intent.camera
          ? stream?.getVideoTracks().find((t) => t.readyState === "live")
          : undefined,
      });
      wasEnabledRef.current = false;
    }
    queueMicrotask(() => {
      const handoff = peekLobbyMediaHandoff();
      setPreviewStream((prev) => {
        prev?.getTracks().forEach((track) => {
          if (handoff?.audio && track.id === handoff.audio.id) return;
          if (handoff?.video && track.id === handoff.video.id) return;
          track.stop();
        });
        return null;
      });
      setMicOn(false);
      setCamOn(false);
      setError(null);
      setAcquiring(null);
    });
  }, [enabled]);

  const addTrackToPreview = useCallback((track: MediaStreamTrack) => {
    setPreviewStream((prev) => {
      const next = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
      for (const existing of next.getTracks()) {
        if (existing.kind === track.kind) {
          existing.stop();
          next.removeTrack(existing);
        }
      }
      next.addTrack(track);
      return next;
    });
  }, []);

  const removeKindFromPreview = useCallback((kind: "audio" | "video") => {
    setPreviewStream((prev) => {
      if (!prev) return null;
      for (const track of prev.getTracks()) {
        if (track.kind === kind) track.stop();
      }
      return streamWithoutKind(prev, kind);
    });
  }, []);

  const toggleMic = useCallback(async () => {
    if (!enabledRef.current) return;
    if (micOn) {
      removeKindFromPreview("audio");
      setMicOn(false);
      return;
    }
    setAcquiring("mic");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!enabledRef.current) {
        stopTracks(stream);
        return;
      }
      const track = stream.getAudioTracks()[0];
      if (!track) throw new Error("No microphone track available");
      stream.getVideoTracks().forEach((t) => t.stop());
      addTrackToPreview(track);
      setMicOn(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not access microphone");
    } finally {
      setAcquiring(null);
    }
  }, [micOn, addTrackToPreview, removeKindFromPreview]);

  const toggleCamera = useCallback(async () => {
    if (!enabledRef.current) return;
    if (camOn) {
      removeKindFromPreview("video");
      setCamOn(false);
      return;
    }
    setAcquiring("cam");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getCameraCaptureConstraints(),
      });
      if (!enabledRef.current) {
        stopTracks(stream);
        return;
      }
      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error("No camera track available");
      stream.getAudioTracks().forEach((t) => t.stop());
      addTrackToPreview(track);
      setCamOn(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not access camera");
    } finally {
      setAcquiring(null);
    }
  }, [camOn, addTrackToPreview, removeKindFromPreview]);

  const hasVideo = Boolean(previewStream?.getVideoTracks().some((t) => t.readyState === "live"));

  return {
    previewStream: hasVideo ? previewStream : null,
    micOn,
    camOn,
    acquiring,
    toggleMic,
    toggleCamera,
    error,
  };
}
