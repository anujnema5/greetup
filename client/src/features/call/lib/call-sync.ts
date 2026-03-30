/** Cross-tab / opener–popup sync so the call UI can survive refreshes on other routes. */

import { clearCallReturnPath } from "./call-return-path";

export const CALL_SESSION_KEY = "circlo-call-active";
export const CALL_MINIMIZED_KEY = "circlo-call-minimized";
export const CALL_CHANNEL_NAME = "circlo-call";

export type CallChannelMessage =
  | { type: "END_CALL" }
  | { type: "SKIP_CALL" };

export function markCallSessionActive(): void {
  try {
    sessionStorage.setItem(CALL_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function markCallMinimized(): void {
  try {
    sessionStorage.setItem(CALL_MINIMIZED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearCallMinimized(): void {
  try {
    sessionStorage.removeItem(CALL_MINIMIZED_KEY);
  } catch {
    /* ignore */
  }
}

export function isCallMinimizedMarked(): boolean {
  try {
    return sessionStorage.getItem(CALL_MINIMIZED_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearCallSession(): void {
  try {
    sessionStorage.removeItem(CALL_SESSION_KEY);
    sessionStorage.removeItem(CALL_MINIMIZED_KEY);
  } catch {
    /* ignore */
  }
  clearCallReturnPath();
}

export function isCallSessionMarkedActive(): boolean {
  try {
    return sessionStorage.getItem(CALL_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function broadcastCallMessage(msg: CallChannelMessage): void {
  try {
    const ch = new BroadcastChannel(CALL_CHANNEL_NAME);
    ch.postMessage(msg);
    ch.close();
  } catch {
    /* ignore */
  }
}

export function subscribeCallChannel(
  handler: (msg: CallChannelMessage) => void
): () => void {
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CALL_CHANNEL_NAME);
    ch.onmessage = (ev: MessageEvent<CallChannelMessage>) => {
      if (ev?.data?.type) handler(ev.data);
    };
  } catch {
    /* ignore */
  }
  return () => {
    try {
      ch?.close();
    } catch {
      /* ignore */
    }
  };
}
