import type { OutgoingConnectionCall } from '../types/connection-call.types';

type Listener = (call: OutgoingConnectionCall | null) => void;

let outgoing: OutgoingConnectionCall | null = null;
const listeners = new Set<Listener>();

export function getOutgoingCall(): OutgoingConnectionCall | null {
  return outgoing;
}

export function setOutgoingCall(call: OutgoingConnectionCall): void {
  outgoing = call;
  listeners.forEach((fn) => fn(outgoing));
}

export function clearOutgoingCall(): void {
  if (!outgoing) return;
  outgoing = null;
  listeners.forEach((fn) => fn(null));
}

export function markOutgoingCallConnected(requestId: string): void {
  if (!outgoing || outgoing.requestId !== requestId) return;
  outgoing = { ...outgoing, status: 'connected' };
  listeners.forEach((fn) => fn(outgoing));
}

export function subscribeOutgoingCall(listener: Listener): () => void {
  listeners.add(listener);
  listener(outgoing);
  return () => listeners.delete(listener);
}
