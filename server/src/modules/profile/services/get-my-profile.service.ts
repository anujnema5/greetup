import { profileStepsRepository } from "../repositories/profile-steps.repository";
import type { MyProfileResponse } from "../types/my-profile.types";

export type { MyProfileResponse } from "../types/my-profile.types";

export async function getMyProfileService(userId: string): Promise<MyProfileResponse | null> {
  const p = await profileStepsRepository.getProfileForSteps(userId);
  if (!p) return null;

  const professionRow = p.professions?.[0]?.profession;

  return {
    displayName: p.user?.displayName ?? p.user?.name ?? null,
    bio: p.bio,
    age: p.age,
    gender: p.gender,
    profileCompletion: p.profileCompletion,
    isOnboarded: p.isOnboarded ?? null,
    location: p.location
      ? {
          country: p.location.country,
          countryCode: p.location.countryCode,
          city: p.location.city,
        }
      : null,
    photos: (p.photos ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((ph) => ({
        id: ph.id,
        url: ph.photoUrl,
        order: ph.order,
        isVerified: ph.isVerified,
      })),
    goals: (p.goals ?? []).map((g) => ({
      id: g.goal.id,
      name: g.goal.name,
      displayName: g.goal.displayName,
    })),
    interests: (p.interests ?? []).map((i) => ({
      id: i.interest.id,
      name: i.interest.name,
      displayName: i.interest.displayName,
      category: i.interest.category,
    })),
    profession: professionRow
      ? {
          id: professionRow.id,
          name: professionRow.name,
          displayName: professionRow.displayName,
          category: professionRow.category,
        }
      : null,
    preferences: p.preferences
      ? {
          preferredGender: p.preferences.preferredGender,
          distancePreference: p.preferences.distancePreference,
          minAge: p.preferences.minAge,
          maxAge: p.preferences.maxAge,
          connectionTypes: (p.preferences.connectionTypes ?? []).map((c) => ({
            id: c.connectionType.id,
            name: c.connectionType.name,
            displayName: c.connectionType.displayName,
          })),
        }
      : null,
  };
}
