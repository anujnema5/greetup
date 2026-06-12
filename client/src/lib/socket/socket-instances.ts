import { io, type Socket } from 'socket.io-client';
import { SOCKET_SERVER_URL } from '@/shared/constants/environments';

/** Shared Socket.IO client options for the main and /chat namespaces. */
const SOCKET_CLIENT_OPTIONS = {
  autoConnect: true,
  reconnectionDelay: 2000,
  timeout: 10_000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling'] as string[],
  withCredentials: true,
  forceNew: false,
} as const;

type AppSocketPair = {
  main: Socket;
  chat: Socket;
};

let pair: AppSocketPair | null = null;

/**
 * Returns one main + /chat socket pair for this tab.
 * Reused across React re-renders so session updates don't open new connections.
 */
export function getAppSocketPair(deviceId: string, timezone: string): AppSocketPair {
  if (pair) return pair;

  const query = { deviceId, timezone };
  pair = {
    main: io(SOCKET_SERVER_URL, { ...SOCKET_CLIENT_OPTIONS, query }),
    chat: io(`${SOCKET_SERVER_URL}/chat`, { ...SOCKET_CLIENT_OPTIONS, query }),
  };
  return pair;
}
