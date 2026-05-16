/** Props from rtc-service `dominantSpeaker` socket events (live speaker + speaking time). */
export type ActiveSpeakerProps = {
  dominantSpeakerPeerId?: string | null;
  dominantSpeakerSpeakingMs?: Record<string, number>;
};

/** @deprecated Use `ActiveSpeakerProps`. */
export type DominantSpeakerCallState = ActiveSpeakerProps;
