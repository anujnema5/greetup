import type { LandingConversationCue } from "../components/landing-conversation-cue-toast";

/**
 * Example cues for the landing page — copied from in-call Gemini prompt examples
 * (`generate-conversation-cues-gemini.service.ts`).
 */
export const LANDING_CONVERSATION_CUE_EXAMPLES: LandingConversationCue[] = [
  {
    emoji: "♟️",
    title: "You both selected Play chess",
    body: "Easy icebreaker once you've said hi.",
  },
  {
    emoji: "💨",
    title: "They selected Vent",
    body: "They may want space to talk — lead with listening.",
  },
  {
    emoji: "🗣️",
    title: "You both picked Language practice",
    body: "Same focus: Spanish.",
  },
] as const;

/** Single cue shown in the in-call mockup — matches the first real cue users typically see. */
export const LANDING_CUES_DEMO_CUE = LANDING_CONVERSATION_CUE_EXAMPLES[0]!;
