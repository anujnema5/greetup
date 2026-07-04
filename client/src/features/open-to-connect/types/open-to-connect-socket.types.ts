import type { OpenNowActivityTag } from "./open-to-connect.types";

export type OtcFeedUserAvailableSocketPayload = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  headline: string | null;
  activities: OpenNowActivityTag[];
  lookingFor: string[];
  profession: string | null;
  interestIds: string[];
  interestLabels: Record<string, string>;
};

export type OtcFeedUserUnavailableSocketPayload = {
  userId: string;
};

export const OTC_CALL_SOCKET_EVENTS = {
  ended: "otc:call_ended",
} as const;

export type OtcCallEndedSocketPayload = {
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

export function parseOtcCallEndedPayload(payload: unknown): OtcCallEndedSocketPayload | null {
  if (!isRecord(payload)) return null;
  const roomId = readString(payload, "roomId");
  const endedByUserId = readString(payload, "endedByUserId");
  if (!roomId || !endedByUserId) return null;
  return { roomId, endedByUserId };
}
