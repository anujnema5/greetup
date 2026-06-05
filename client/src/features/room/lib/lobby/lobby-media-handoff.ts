/**
 * Live `getUserMedia` tracks from the pre-join lobby, reused in the call so we do not
 * stop/re-request capture when transitioning lobby → room.
 */

export type LobbyMediaHandoff = {
  audio?: MediaStreamTrack;
  video?: MediaStreamTrack;
};

let pendingHandoff: LobbyMediaHandoff | null = null;

export function registerLobbyMediaHandoff(tracks: LobbyMediaHandoff): void {
  pendingHandoff = tracks;
}

export function peekLobbyMediaHandoff(): LobbyMediaHandoff | null {
  return pendingHandoff;
}

export function takeLobbyHandoffAudio(): MediaStreamTrack | undefined {
  if (!pendingHandoff?.audio) return undefined;
  const track = pendingHandoff.audio;
  pendingHandoff.audio = undefined;
  if (!pendingHandoff.audio && !pendingHandoff.video) pendingHandoff = null;
  return track;
}

export function takeLobbyHandoffVideo(): MediaStreamTrack | undefined {
  if (!pendingHandoff?.video) return undefined;
  const track = pendingHandoff.video;
  pendingHandoff.video = undefined;
  if (!pendingHandoff.audio && !pendingHandoff.video) pendingHandoff = null;
  return track;
}

export function clearLobbyMediaHandoff(): void {
  if (!pendingHandoff) return;
  pendingHandoff.audio?.stop();
  pendingHandoff.video?.stop();
  pendingHandoff = null;
}
