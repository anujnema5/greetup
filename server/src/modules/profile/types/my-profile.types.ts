/**
 * GET /profile/me — assembled profile payload for the authenticated user.
 * Client mirror: `client/src/features/profile/types/my-profile.types.ts`.
 */
export type MyProfileResponse = {
  /** Public handle for profile URL `/u/{username}` */
  username: string | null;
  displayName: string | null;
  bio: string | null;
  age: number | null;
  gender: string | null;
  profileCompletion: number | null;
  isOnboarded: boolean | null;
  location: {
    country: string | null;
    countryCode: string | null;
    city: string | null;
  } | null;
  photos: Array<{
    id: string;
    url: string;
    order: number | null;
    isVerified: boolean | null;
  }>;
  goals: Array<{ id: string; name: string; displayName: string }>;
  interests: Array<{
    id: string;
    name: string;
    displayName: string;
    category: string;
  }>;
  profession: {
    id: string;
    name: string;
    displayName: string;
    category: string;
  } | null;
  preferences: {
    preferredGender: string | null;
    distancePreference: string | null;
    minAge: number | null;
    maxAge: number | null;
  } | null;
  /** Who may add this user when creating a room with friend invites. */
  roomInvite: {
    policy: "all_connections" | "selected_only";
    allowlistedUserIds: string[];
  };
};
