/**
 * In-app product tours — spotlight walkthroughs for key surfaces.
 *
 * - Eligibility: `user_profiles.welcome_tour_seen_at` (server)
 * - Provider: `TourGuideProvider` in root layout
 * - Auto-start: `WelcomeTourLauncher` on `/home` (once after onboarding)
 * - Replay: `ReplayTourSettingsCard` in Settings (manual, does not reset DB)
 */
export { TourGuideProvider, useTourGuide } from "./context/tour-guide-provider";
export { WelcomeTourLauncher } from "./components/welcome-tour-launcher";
export { ReplayTourSettingsCard } from "./components/replay-tour-settings-card";
export { useWelcomeTourStatus } from "./api/tour-guide.queries";
export { useMarkWelcomeTourSeen } from "./api/tour-guide.mutations";
export { TOUR_TARGETS } from "./constants/tour-targets";
export type { TourId, TourTargetId } from "./types/tour.types";
export type { WelcomeTourStatusData } from "./api/tour-guide.queries";
