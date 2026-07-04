export const OTC_CALL_SOCKET_EVENTS = {
  ended: "otc:call_ended",
} as const;

export type OtcCallEndedPayload = {
  roomId: string;
  endedByUserId: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function parseOtcCallEndedPayload(payload: unknown): OtcCallEndedPayload | null {
  if (!isRecord(payload)) return null;
  const roomId = readString(payload, "roomId");
  const endedByUserId = readString(payload, "endedByUserId");
  if (!roomId || !endedByUserId) return null;
  return { roomId, endedByUserId };
}
