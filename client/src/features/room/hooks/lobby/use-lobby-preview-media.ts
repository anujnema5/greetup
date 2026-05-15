"use client";

import { useCallback, useEffect, useState } from "react";
import { getCameraCaptureConstraints } from "@/features/rtc/lib/mediasoup-local-capture-constraints";

/**
 * Local camera + mic preview while waiting on RTC (e.g. scheduled circle lobby).
 * Stops all tracks when `enabled` becomes false.
 */
export function useLobbyPreviewMedia(enabled: boolean) {
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setPreviewStream((prev) => {
          prev?.getTracks().forEach((t) => t.stop());
          return null;
        });
        setError(null);
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: getCameraCaptureConstraints(),
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setPreviewStream(stream);
        setMicOn(true);
        setCamOn(true);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not access camera or microphone");
        }
      }
    })();

    return () => {
      cancelled = true;
      setPreviewStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, [enabled]);

  useEffect(() => {
    if (!previewStream) return;
    const a = previewStream.getAudioTracks()[0];
    if (a) a.enabled = micOn;
    const v = previewStream.getVideoTracks()[0];
    if (v) v.enabled = camOn;
  }, [previewStream, micOn, camOn]);

  const toggleMic = useCallback(() => setMicOn((m) => !m), []);
  const toggleCamera = useCallback(() => setCamOn((c) => !c), []);

  return { previewStream, micOn, camOn, toggleMic, toggleCamera, error };
}
