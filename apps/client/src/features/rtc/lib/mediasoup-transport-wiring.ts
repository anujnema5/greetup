import type { Transport } from "mediasoup-client/types";
import type { Socket } from "socket.io-client";
import type { ProduceAck, SimpleAck } from "@/features/rtc/types/mediasoup-room.types";
import { emitRtcAck, isAckErr, isAckOk } from "@/features/rtc/lib/rtc-signaling";

export function wireTransportConnect(socket: Socket, transport: Transport): void {
  transport.on("connect", ({ dtlsParameters }, callback, errback) => {
    void emitRtcAck<SimpleAck>(socket, "connectTransport", {
      transportId: transport.id,
      dtlsParameters,
    })
      .then((r) => {
        if (isAckOk(r)) callback();
        else errback(new Error(isAckErr(r) ? (r.error?.code ?? "connectTransport") : "connectTransport"));
      })
      .catch((e) => errback(e instanceof Error ? e : new Error(String(e))));
  });
}

export function wireSendTransportProduce(socket: Socket, transport: Transport): void {
  transport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
    void emitRtcAck<ProduceAck>(socket, "produce", {
      transportId: transport.id,
      kind,
      rtpParameters,
      appData,
    })
      .then((r) => {
        if (r && typeof r === "object" && "ok" in r && r.ok && "id" in r && typeof r.id === "string") {
          callback({ id: r.id });
        } else {
          errback(new Error(isAckErr(r) ? (r.error?.code ?? "produce") : "produce"));
        }
      })
      .catch((e) => errback(e instanceof Error ? e : new Error(String(e))));
  });
}
