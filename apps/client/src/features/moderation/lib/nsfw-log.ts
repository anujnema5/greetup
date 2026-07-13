import { NSFW_HITS_BEFORE_REPORT, NSFW_SCAN_INTERVAL_MS } from "./nsfw-config";
import type { NsfwPrediction } from "./nsfw-thresholds";

const PREFIX = "[NSFW moderation]";

export function isNsfwLogEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem("NSFW_DEBUG") === "0") return false;
  return (
    process.env.NODE_ENV === "development" ||
    window.localStorage.getItem("NSFW_DEBUG") === "1"
  );
}

function scoresLabel(predictions: NsfwPrediction[]): Record<string, string> {
  return Object.fromEntries(
    predictions.map((p) => [p.className, `${(p.probability * 100).toFixed(1)}%`]),
  );
}

function emit(message: string, data?: Record<string, unknown>): void {
  if (!isNsfwLogEnabled()) return;
  if (data) console.log(PREFIX, message, data);
  else console.log(PREFIX, message);
}

export function logNsfwLoopStarted(
  roomId: string,
  enforceReport: boolean,
  debugOnly: boolean,
): void {
  emit("started", {
    roomId,
    enforceReport,
    debugOnly,
    everyMs: NSFW_SCAN_INTERVAL_MS,
    hitsBeforeReport: NSFW_HITS_BEFORE_REPORT,
  });
}

export function logNsfwModelReady(): void {
  emit("model loaded");
}

export function logNsfwScan(args: {
  roomId: string;
  scanNumber: number;
  flagged: boolean;
  hitCount: number;
  willReport: boolean;
  predictions: NsfwPrediction[];
}): void {
  emit(`scan #${args.scanNumber}`, {
    roomId: args.roomId,
    flagged: args.flagged,
    hitCount: args.hitCount,
    hitsNeeded: NSFW_HITS_BEFORE_REPORT,
    willReport: args.willReport,
    scores: scoresLabel(args.predictions),
  });
}

export function logNsfwSkipped(reason: string): void {
  emit("skipped", { reason });
}

export function logNsfwReported(roomId: string, predictions: NsfwPrediction[]): void {
  emit("reported", { roomId, scores: scoresLabel(predictions) });
}
