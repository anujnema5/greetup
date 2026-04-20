/** Cross-tab sync so the room video survives refresh / navigation. */

import { clearRoomReturnPath } from "./room-return-path";

export const ROOM_ACTIVE_KEY = "greetup-call-active";
export const ROOM_MINIMIZED_KEY = "greetup-call-minimized";
export const ROOM_CHANNEL_NAME = "greetup-call";

export type RoomChannelMessage =
  | { type: "END_CALL" }
  | { type: "SKIP_CALL" };

export function markRoomActive(): void {
  try {
    sessionStorage.setItem(ROOM_ACTIVE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function markRoomMinimized(): void {
  try {
    sessionStorage.setItem(ROOM_MINIMIZED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearRoomMinimized(): void {
  try {
    sessionStorage.removeItem(ROOM_MINIMIZED_KEY);
  } catch {
    /* ignore */
  }
}

export function isRoomMinimizedMarked(): boolean {
  try {
    return sessionStorage.getItem(ROOM_MINIMIZED_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearRoomStorage(): void {
  try {
    sessionStorage.removeItem(ROOM_ACTIVE_KEY);
    sessionStorage.removeItem(ROOM_MINIMIZED_KEY);
  } catch {
    /* ignore */
  }
  clearRoomReturnPath();
}

export function isRoomMarkedActive(): boolean {
  try {
    return sessionStorage.getItem(ROOM_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function broadcastRoomMessage(msg: RoomChannelMessage): void {
  try {
    const ch = new BroadcastChannel(ROOM_CHANNEL_NAME);
    ch.postMessage(msg);
    ch.close();
  } catch {
    /* ignore */
  }
}

export function subscribeRoomChannel(
  handler: (msg: RoomChannelMessage) => void,
): () => void {
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(ROOM_CHANNEL_NAME);
    ch.onmessage = (ev: MessageEvent<RoomChannelMessage>) => {
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
