import type { OpenNowActivityTag } from "./open-to-connect.types";

export type OtcFeedUserAvailableSocketPayload = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  headline: string | null;
  activities: OpenNowActivityTag[];
  lookingFor: string[];
  profession: string | null;
  interestIds: string[];
  interestLabels: Record<string, string>;
};

export type OtcFeedUserUnavailableSocketPayload = {
  userId: string;
};
