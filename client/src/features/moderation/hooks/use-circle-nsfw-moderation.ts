"use client";

import { useEffect, useRef } from "react";
import { useReportCircleNsfwViolationMutation } from "@/features/room/api/room-api";
import { NSFW_HITS_BEFORE_REPORT, NSFW_SCAN_INTERVAL_MS } from "@/features/moderation/lib/nsfw-config";
import { isNsfwLogEnabled, logNsfwLoopStarted, logNsfwReported, logNsfwScan, logNsfwSkipped } from "@/features/moderation/lib/nsfw-log";
import { classifyStreamFrame } from "@/features/moderation/lib/nsfw-scanner";
import { isNsfwPrediction } from "@/features/moderation/lib/nsfw-thresholds";

export type UseCircleNsfwModerationArgs = {
  roomId: string;
  enabled?: boolean | null;
  localStream: MediaStream | null;
  mediasoupReady: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
};

export function useCircleNsfwModeration({
  roomId,
  enabled,
  localStream,
  mediasoupReady,
  cameraEnabled,
  screenSharing,
}: UseCircleNsfwModerationArgs): void {
  const enforceReport = Boolean(enabled);
  const [reportViolation] = useReportCircleNsfwViolationMutation();
  const reportRef = useRef(reportViolation);
  const streamRef = useRef(localStream);

  useEffect(() => {
    reportRef.current = reportViolation;
  });
  const scanActive = enforceReport || isNsfwLogEnabled();
  const hasVideo = cameraEnabled || screenSharing;

  useEffect(() => {
    streamRef.current = localStream;
  });

  useEffect(() => {
    if (!scanActive || !mediasoupReady || !hasVideo) return;

    let cancelled = false;
    let consecutiveHits = 0;
    let scanNumber = 0;
    let reporting = false;

    logNsfwLoopStarted(roomId, enforceReport, scanActive && !enforceReport);

    const tick = async () => {
      const stream = streamRef.current;
      if (cancelled || reporting || !stream) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      scanNumber += 1;
      const predictions = await classifyStreamFrame(stream);
      if (cancelled || !predictions) {
        if (!predictions) logNsfwSkipped("no frame / classify failed");
        return;
      }

      const flagged = isNsfwPrediction(predictions);
      consecutiveHits = flagged ? consecutiveHits + 1 : 0;
      const willReport = Boolean(
        enforceReport && flagged && consecutiveHits >= NSFW_HITS_BEFORE_REPORT,
      );

      logNsfwScan({
        roomId,
        scanNumber,
        flagged,
        hitCount: consecutiveHits,
        willReport,
        predictions,
      });

      if (!willReport) return;

      reporting = true;
      try {
        await reportRef.current({ roomId, clientScores: predictions }).unwrap();
        logNsfwReported(roomId, predictions);
      } catch {
        logNsfwSkipped("report failed");
        reporting = false;
        consecutiveHits = 0;
      }
    };

    void tick();
    const intervalId = window.setInterval(() => void tick(), NSFW_SCAN_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enforceReport, hasVideo, mediasoupReady, roomId, scanActive]);
}
