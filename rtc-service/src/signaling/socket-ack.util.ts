/** Socket.IO ack callbacks are optional; normalize so handlers always call a function. */

export type SocketAckFn = (payload: unknown) => void;

export function asSocketAck(ack: unknown): SocketAckFn {
  return typeof ack === "function" ? (ack as SocketAckFn) : () => {};
}
