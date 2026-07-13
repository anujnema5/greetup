import type { Socket } from "socket.io-client";

const ACK_MS = 35_000;

/** Socket.IO single-arg ack matching rtc-service handlers. */
export function emitRtcAck<T>(socket: Socket, event: string, payload: unknown = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event}_timeout`)), ACK_MS);
    socket.emit(event, payload, (response: T) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

export function isAckOk(value: unknown): value is { ok: true } {
  return Boolean(value && typeof value === "object" && "ok" in value && (value as { ok: unknown }).ok === true);
}

export function isAckErr(value: unknown): value is { ok: false; error?: { code?: string; message?: string } } {
  return Boolean(value && typeof value === "object" && "ok" in value && (value as { ok: unknown }).ok === false);
}
