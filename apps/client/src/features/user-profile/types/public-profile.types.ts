import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

export type PublicProfileConnectionState =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted"
  | "rejected"
  | "cancelled";

export type PublicProfileLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
};

export type PublicProfileData = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  bio: string | null;
  age: number | null;
  gender: string | null;
  purpose: string | null;
  educationLevel: string | null;
  professionText: string | null;
  personalityTags: string | null;
  location: PublicProfileLocation | null;
  goals: Array<{ id: string; displayName: string }>;
  interests: Array<{ id: string; displayName: string; category: string }>;
  professions: Array<{ id: string; displayName: string; category: string }>;
  sessionGoal: string | null;
  moods: Array<{ displayName: string }>;
  photos: Array<{
    id: string;
    url: string;
    order: number | null;
    isVerified: boolean | null;
  }>;
  connectionState: PublicProfileConnectionState;
  connectionId: string | null;
  isViewer: boolean;
};

export type PublicProfileApiResponse = ApiResponse<PublicProfileData>;
