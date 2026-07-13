import type { ConnectionCallMode } from "@/modules/connections/services/connection-call.service";

export type ConnectionCallHistoryStatus = "completed" | "missed" | "declined" | "cancelled";

export type ConnectionCallSystemPayload = {
  event: "connection_call";
  mode: ConnectionCallMode;
  status: ConnectionCallHistoryStatus;
  durationSec: number | null;
  initiatorUserId: string;
};

export function isConnectionCallSystemPayload(payload: unknown): payload is ConnectionCallSystemPayload {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return false;
  const o = payload as Record<string, unknown>;
  return (
    o.event === "connection_call"
    && (o.mode === "audio" || o.mode === "video")
    && (o.status === "completed" || o.status === "missed" || o.status === "declined" || o.status === "cancelled")
    && typeof o.initiatorUserId === "string"
  );
}

function modeLabel(mode: ConnectionCallMode): string {
  return mode === "video" ? "Video call" : "Voice call";
}

function formatDuration(durationSec: number): string {
  if (durationSec < 60) {
    const s = Math.max(0, durationSec);
    return `0:${String(s).padStart(2, "0")}`;
  }
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}:${String(remMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** Neutral inbox preview (no viewer context). */
export function connectionCallInboxPreview(payload: ConnectionCallSystemPayload): string {
  const label = modeLabel(payload.mode);
  switch (payload.status) {
    case "completed": {
      const dur = payload.durationSec ?? 0;
      return dur > 0 ? `${label} · ${formatDuration(dur)}` : label;
    }
    case "missed":
      return `Missed ${payload.mode === "video" ? "video" : "voice"} call`;
    case "declined":
      return `${label} declined`;
    case "cancelled":
      return `${label} cancelled`;
    default:
      return label;
  }
}

export function buildConnectionCallSystemPayload(params: {
  mode: ConnectionCallMode;
  status: ConnectionCallHistoryStatus;
  initiatorUserId: string;
  durationSec?: number | null;
}): ConnectionCallSystemPayload {
  return {
    event: "connection_call",
    mode: params.mode,
    status: params.status,
    durationSec: params.durationSec ?? null,
    initiatorUserId: params.initiatorUserId,
  };
}
