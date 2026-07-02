import { MATCH_FOUND_DIALOG } from "@/lib/copy/user-messages";

export type MatchCompatibilityDisplay = {
  fitLabel: string;
  description: string;
  progressAriaLabel: string;
};

/** Maps engine match score (0–100) to user-facing compatibility copy for the proposal modal. */
export function formatMatchCompatibility(scorePct: number): MatchCompatibilityDisplay {
  const score = Math.min(100, Math.max(0, Math.round(scorePct)));

  if (score >= 80) {
    return {
      fitLabel: MATCH_FOUND_DIALOG.fit.strong,
      description: MATCH_FOUND_DIALOG.description.strong,
      progressAriaLabel: `${MATCH_FOUND_DIALOG.compatibilityLabel}: ${MATCH_FOUND_DIALOG.fit.strong}, ${score} percent`,
    };
  }

  if (score >= 60) {
    return {
      fitLabel: MATCH_FOUND_DIALOG.fit.good,
      description: MATCH_FOUND_DIALOG.description.good,
      progressAriaLabel: `${MATCH_FOUND_DIALOG.compatibilityLabel}: ${MATCH_FOUND_DIALOG.fit.good}, ${score} percent`,
    };
  }

  return {
    fitLabel: MATCH_FOUND_DIALOG.fit.fair,
    description: MATCH_FOUND_DIALOG.description.fair,
    progressAriaLabel: `${MATCH_FOUND_DIALOG.compatibilityLabel}: ${MATCH_FOUND_DIALOG.fit.fair}, ${score} percent`,
  };
}
