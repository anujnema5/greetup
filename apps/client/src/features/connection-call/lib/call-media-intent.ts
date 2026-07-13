import { setLobbyMediaIntent } from '@/features/room/lib/lobby';
import type { ConnectionCallMode } from '../types/connection-call.types';

/** Mic always on; camera only for video calls (user can toggle later). */
export function applyConnectionCallMediaIntent(mode: ConnectionCallMode): void {
  setLobbyMediaIntent({
    mic: true,
    camera: mode === 'video',
  });
}
