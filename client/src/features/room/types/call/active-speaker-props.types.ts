/** Props from rtc-service `dominantSpeaker` socket (live speaker + cumulative speaking ms). */
export type LiveSpeakerCallProps = {
  liveSpeakerPeerId?: string | null;
  liveSpeakerSpeakingMs?: Record<string, number>;
};
