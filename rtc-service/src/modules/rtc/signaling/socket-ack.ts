export type SocketAckFn = (payload: unknown) => void;

export function asSocketAck(ack: unknown): SocketAckFn {
  return typeof ack === "function" ? (ack as SocketAckFn) : () => {};
}
