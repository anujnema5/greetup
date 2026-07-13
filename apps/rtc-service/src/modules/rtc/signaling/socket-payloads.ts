import type { types as MediasoupTypes } from "mediasoup";

export type WebRtcTransportDirection = "send" | "recv";

export function parseCreateWebRtcTransportPayload(payload: unknown): WebRtcTransportDirection {
  const body = payload as { direction?: unknown } | undefined;
  return body?.direction === "recv" ? "recv" : "send";
}

export function parseConnectTransportPayload(
  payload: unknown,
): { transportId: string; dtlsParameters: MediasoupTypes.DtlsParameters } | null {
  const body = payload as { transportId?: unknown; dtlsParameters?: unknown } | undefined;
  if (!body || typeof body.transportId !== "string" || !body.dtlsParameters) return null;
  return {
    transportId: body.transportId,
    dtlsParameters: body.dtlsParameters as MediasoupTypes.DtlsParameters,
  };
}

export function parseRestartIcePayload(payload: unknown): { transportId: string } | null {
  const body = payload as { transportId?: unknown } | undefined;
  if (!body || typeof body.transportId !== "string") return null;
  return { transportId: body.transportId };
}

export type ProduceClientPayload = {
  transportId: string;
  kind: MediasoupTypes.MediaKind;
  rtpParameters: MediasoupTypes.RtpParameters;
  appData?: Record<string, unknown>;
};

export function parseProducePayload(payload: unknown): ProduceClientPayload | null {
  const body = payload as {
    transportId?: unknown;
    kind?: unknown;
    rtpParameters?: unknown;
    appData?: unknown;
  } | undefined;
  if (
    !body ||
    typeof body.transportId !== "string" ||
    (body.kind !== "audio" && body.kind !== "video") ||
    !body.rtpParameters
  ) {
    return null;
  }
  return {
    transportId: body.transportId,
    kind: body.kind,
    rtpParameters: body.rtpParameters as MediasoupTypes.RtpParameters,
    appData:
      body.appData && typeof body.appData === "object"
        ? (body.appData as Record<string, unknown>)
        : undefined,
  };
}

export type ConsumeClientPayload = {
  transportId: string;
  producerId: string;
  rtpCapabilities: MediasoupTypes.RtpCapabilities;
  paused: boolean;
};

export function parseConsumePayload(payload: unknown): ConsumeClientPayload | null {
  const body = payload as {
    transportId?: unknown;
    producerId?: unknown;
    rtpCapabilities?: unknown;
    paused?: unknown;
  } | undefined;
  if (
    !body ||
    typeof body.transportId !== "string" ||
    typeof body.producerId !== "string" ||
    !body.rtpCapabilities
  ) {
    return null;
  }
  return {
    transportId: body.transportId,
    producerId: body.producerId,
    rtpCapabilities: body.rtpCapabilities as MediasoupTypes.RtpCapabilities,
    paused: Boolean(body.paused),
  };
}

export function parseResumeConsumerPayload(payload: unknown): string | null {
  const body = payload as { consumerId?: unknown } | undefined;
  if (!body || typeof body.consumerId !== "string") return null;
  return body.consumerId;
}

export function parseCloseProducerPayload(payload: unknown): string | null {
  return parsePauseResumeProducerPayload(payload);
}

export function parsePauseResumeProducerPayload(payload: unknown): string | null {
  const body = payload as { producerId?: unknown } | undefined;
  if (!body || typeof body.producerId !== "string") return null;
  return body.producerId;
}
