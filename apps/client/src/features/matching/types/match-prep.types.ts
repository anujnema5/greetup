import type { MatchPrepCurrentData } from "@/features/profile-setup/types/profile-setup-api.types";

export type MatchPrepDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartSearch: () => void;
  clientSessionId: string | null;
  mode?: "match_flow" | "edit";
  /** When opening from hero, preset match intent before save. */
  initialMatchIntent?: MatchIntentValue;
};

export type ConnectionPreferenceValue = NonNullable<
  MatchPrepCurrentData["connectionPreference"]
>;

export type DistancePreferenceValue = MatchPrepCurrentData["distancePreference"];

export type MatchPrepLocation = {
  country: string;
  countryCode: string;
  region?: string;
  regionCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  source?: "current" | "manual";
};

export type MatchIntentValue = "quick" | "activity";

export type MatchPrepInitialFormState = {
  matchIntent: MatchIntentValue;
  activityDetails: Record<string, string>;
  selectedActivityIds: Set<string>;
  moods: Set<string>;
  lookingFor: Set<string>;
  interests: Set<string>;
  connectionPreference: ConnectionPreferenceValue;
  locationPreferenceEnabled: boolean;
  distancePreference: DistancePreferenceValue;
  location: MatchPrepLocation | null;
  sessionGoal: string;
};
