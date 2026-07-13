/**
 * Snapshot of mic/camera choices from the pre-join circle lobby.
 * Written when the lobby closes; consumed when mediasoup is ready.
 */

export type LobbyMediaIntent = {
  mic: boolean;
  camera: boolean;
};

let pendingIntent: LobbyMediaIntent | null = null;

export function setLobbyMediaIntent(intent: LobbyMediaIntent): void {
  pendingIntent = intent;
}

export function peekLobbyMediaIntent(): LobbyMediaIntent | null {
  return pendingIntent;
}

export function clearLobbyMediaIntent(): void {
  pendingIntent = null;
}

/** True when there is nothing left to apply for the current join. */
export function isLobbyMediaIntentFulfilled(
  intent: LobbyMediaIntent,
  micEnabled: boolean,
  cameraEnabled: boolean,
): boolean {
  return (!intent.mic || micEnabled) && (!intent.camera || cameraEnabled);
}
