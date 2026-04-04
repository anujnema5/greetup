export type ProfileGender = "male" | "female" | "other";

/** Editable form shape; filled from API via `mapMyProfileToEditable` (`MyProfileResponse`). */
export type EditableProfile = {
  displayName: string;
  age: number;
  gender: ProfileGender;
  country: { code: string; name: string };
  goalIds: string[];
  interestIds: string[];
  professionId: string | null;
  bio: string;
  preferredGender: "any" | "male" | "female" | "others" | "same";
  distancePreference: "nearby" | "same city" | "same country" | "random" | "global";
  ageRange: { min: number; max: number };
  /** At most one profile image for avatar; API may return a single photo */
  photos: Array<{ id: string; url: string }>;
};

export type ProfileEditSectionId =
  | "basics"
  | "goals"
  | "interests"
  | "work"
  | "preferences"
  | "bio";
