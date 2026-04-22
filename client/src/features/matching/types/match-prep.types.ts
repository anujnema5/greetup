import type { MatchPrepCurrentData } from "@/features/profile-setup/types/profile-setup-api.types";

export type MatchPrepDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartSearch: () => void;
  clientSessionId: string | null;
  mode?: "match_flow" | "edit";
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

export type MatchPrepInitialFormState = {
  moods: Set<string>;
  lookingFor: Set<string>;
  interests: Set<string>;
  connectionPreference: ConnectionPreferenceValue;
  locationPreferenceEnabled: boolean;
  distancePreference: DistancePreferenceValue;
  location: MatchPrepLocation | null;
  sessionGoal: string;
};
