import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { userConnectionsRepository } from "@/modules/connections/repositories/user-connections.repository";
import type { PublicProfileConnectionState } from "@/modules/profile/lib/resolve-public-profile-connection";
import { resolveConnectionForPublicProfile } from "@/modules/profile/lib/resolve-public-profile-connection";
import { publicProfileRepository } from "@/modules/profile/repositories/public-profile.repository";

export type { PublicProfileConnectionState };

export type PublicProfileLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
};

export type PublicProfileResult = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  bio: string | null;
  age: number | null;
  gender: string | null;
  /** Why they’re on Greetup (onboarding “purpose”). */
  purpose: string | null;
  educationLevel: string | null;
  /** Legacy single profession text on `user_profiles`, if set. */
  professionText: string | null;
  personalityTags: string | null;
  /** Only populated when the user chose to make location public. */
  location: PublicProfileLocation | null;
  goals: Array<{ id: string; displayName: string }>;
  interests: Array<{ id: string; displayName: string; category: string }>;
  professions: Array<{ id: string; displayName: string; category: string }>;
  /** Current session intent copy (not matching filters). */
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

export async function getPublicProfileByUsername(
  viewerId: string,
  rawUsername: string,
): Promise<PublicProfileResult | null> {
  const username = rawUsername.trim().toLowerCase();
  if (!username) return null;

  const target = await publicProfileRepository.findPublicProfileTargetByUsername(username);

  if (!target || target.isBanned !== "no" || !target.username) {
    return null;
  }

  if (target.id !== viewerId) {
    const blocked = await userBlocksRepository.isEitherBlocked(viewerId, target.id);
    if (blocked) return null;
  }

  const connectionRows =
    target.id === viewerId ? [] : await userConnectionsRepository.findAllBetween(viewerId, target.id);
  const { connectionState, connectionId } = resolveConnectionForPublicProfile(
    connectionRows,
    viewerId,
  );

  const prof = target.profile;
  const emptyExtras = {
    photos: [] as PublicProfileResult["photos"],
    location: null as PublicProfileLocation | null,
    goals: [] as PublicProfileResult["goals"],
    interests: [] as PublicProfileResult["interests"],
    professions: [] as PublicProfileResult["professions"],
    sessionGoal: null as string | null,
    moods: [] as PublicProfileResult["moods"],
  };

  const extras = prof?.id ? await publicProfileRepository.findProfileExtras(prof.id) : emptyExtras;

  return {
    userId: target.id,
    username: target.username,
    displayName: target.displayName,
    name: target.name,
    image: target.image,
    bio: prof?.bio ?? null,
    age: prof?.age ?? null,
    gender: prof?.gender ?? null,
    purpose: prof?.purpose ?? null,
    educationLevel: prof?.educationLevel ?? null,
    professionText: prof?.profession ?? null,
    personalityTags: prof?.personalityTags ?? null,
    location: extras.location,
    goals: extras.goals,
    interests: extras.interests,
    professions: extras.professions,
    sessionGoal: extras.sessionGoal,
    moods: extras.moods,
    photos: extras.photos,
    connectionState,
    connectionId,
    isViewer: target.id === viewerId,
  };
}
