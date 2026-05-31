export type WelcomeTourStatusResponse = {
  /** True when onboarded and the welcome tour has never been dismissed or completed. */
  eligible: boolean;
  seenAt: string | null;
};
