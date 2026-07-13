/** Shortened `/profile-setup` + match-prep rules after guest → full account conversion. */
export type ConvertedGuestOnboardingHints = {
  /** User was upgraded from a guest trial account (`guest_converted_at` set). */
  isConvertedGuest: boolean;
  /** Guest match prep (mood + looking for + interests) is already saved. */
  matchPrepComplete: boolean;
  /** Omit profile-setup "Your interests" step — interests came from guest match prep. */
  skipProfileInterestsStep: boolean;
  /** Do not show the Home match-prep dialog — prefs already captured on `/try`. */
  skipMatchPrepPrompt: boolean;
};
