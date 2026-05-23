"use client";

import { useEffect, useRef } from "react";
import { useReportCircleNsfwViolationMutation } from "@/features/room/api/room-api";
import { classifyStreamFrame } from "@/features/moderation/lib/nsfw-scanner";
import { isNsfwPrediction } from "@/features/moderation/lib/nsfw-thresholds";

const SCAN_INTERVAL_MS = 12_000;
/** Require two consecutive positive scans before reporting (reduces false positives). */
const CONSECUTIVE_HITS_REQUIRED = 2;

export type UseCircleNsfwModerationArgs = {
  roomId: string;
  enabled: boolean;
  /** Local camera and/or screen composite stream while in call. */
  localStream: MediaStream | null;
  mediasoupReady: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
};

/**
 * Periodically samples the user's own outbound video on-device and self-reports to the server on violation.
 */
export function useCircleNsfwModeration({
  roomId,
  enabled,
  localStream,
  mediasoupReady,
  cameraEnabled,
  screenSharing,
}: UseCircleNsfwModerationArgs): void {
  const [reportViolation] = useReportCircleNsfwViolationMutation();
  const consecutiveHitsRef = useRef(0);
  const reportingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !mediasoupReady || !localStream) {
      consecutiveHitsRef.current = 0;
      return;
    }

    const hasOutboundVideo = cameraEnabled || screenSharing;
    if (!hasOutboundVideo) {
      consecutiveHitsRef.current = 0;
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (cancelled || reportingRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      const predictions = await classifyStreamFrame(localStream);
      if (cancelled || !predictions) return;

      if (isNsfwPrediction(predictions)) {
        consecutiveHitsRef.current += 1;
      } else {
        consecutiveHitsRef.current = 0;
        return;
      }

      if (consecutiveHitsRef.current < CONSECUTIVE_HITS_REQUIRED) return;

      reportingRef.current = true;
      try {
        await reportViolation({ roomId, clientScores: predictions }).unwrap();
      } catch {
        reportingRef.current = false;
        consecutiveHitsRef.current = 0;
      }
    };

    const id = window.setInterval(() => {
      void tick();
    }, SCAN_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      consecutiveHitsRef.current = 0;
    };
  }, [
    cameraEnabled,
    enabled,
    localStream,
    mediasoupReady,
    reportViolation,
    roomId,
    screenSharing,
  ]);
}
