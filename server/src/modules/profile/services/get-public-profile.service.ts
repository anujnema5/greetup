import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  currentStatus,
  profileGoals,
  profileInterests,
  profileProfessions,
  userLocations,
  userPhotos,
  users,
} from "@/core/database/schema";
import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { userConnectionsRepository } from "@/modules/connections/repositories/user-connections.repository";

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

export type PublicProfileResult = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  bio: string | null;
  age: number | null;
  gender: string | null;
  /** Why they’re on Circlo (onboarding “purpose”). */
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
  /** Current session intent / vibe copy (not matching filters). */
  sessionGoal: string | null;
  moods: Array<{ displayName: string }>;
  photos: Array<{
    id: string;
    url: string;
    order: number | null;
    isVerified: boolean | null;
  }>;
  connectionState: PublicProfileConnectionState;
  isViewer: boolean;
};

function mapPublicLocation(
  loc:
    | {
        city: string | null;
        region: string | null;
        country: string | null;
        countryCode: string | null;
        isPublic: boolean | null;
      }
    | null
    | undefined,
): PublicProfileLocation | null {
  if (!loc || loc.isPublic !== true) {
    return null;
  }
  return {
    city: loc.city ?? null,
    region: loc.region ?? null,
    country: loc.country ?? null,
    countryCode: loc.countryCode ?? null,
  };
}

async function loadProfileExtras(profileId: string) {
  const [photoRows, locRow, goalRows, interestRows, professionRows, statusRow] = await Promise.all([
    db.query.userPhotos.findMany({
      where: eq(userPhotos.profileId, profileId),
      columns: { id: true, photoUrl: true, order: true, isVerified: true },
      orderBy: (p, { asc: a }) => [a(p.order), a(p.createdAt)],
    }),
    db.query.userLocations.findFirst({
      where: eq(userLocations.profileId, profileId),
      columns: {
        city: true,
        region: true,
        country: true,
        countryCode: true,
        isPublic: true,
      },
    }),
    db.query.profileGoals.findMany({
      where: eq(profileGoals.profileId, profileId),
      with: {
        goal: { columns: { id: true, displayName: true } },
      },
    }),
    db.query.profileInterests.findMany({
      where: eq(profileInterests.profileId, profileId),
      with: {
        interest: { columns: { id: true, displayName: true, category: true } },
      },
    }),
    db.query.profileProfessions.findMany({
      where: eq(profileProfessions.profileId, profileId),
      with: {
        profession: { columns: { id: true, displayName: true, category: true } },
      },
    }),
    db.query.currentStatus.findFirst({
      where: eq(currentStatus.profileId, profileId),
      columns: { sessionGoal: true },
      with: {
        moods: {
          with: {
            mood: { columns: { displayName: true } },
          },
        },
      },
    }),
  ]);

  const goals = goalRows
    .map((row) => row.goal)
    .filter((g): g is NonNullable<typeof g> => Boolean(g?.id && g.displayName))
    .map((g) => ({ id: g.id, displayName: g.displayName }));

  const interests = interestRows
    .map((row) => row.interest)
    .filter((i): i is NonNullable<typeof i> => Boolean(i?.id && i.displayName))
    .map((i) => ({
      id: i.id,
      displayName: i.displayName,
      category: i.category,
    }));

  const professions = professionRows
    .map((row) => row.profession)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.id && p.displayName))
    .map((p) => ({
      id: p.id,
      displayName: p.displayName,
      category: p.category,
    }));

  const moods =
    statusRow?.moods
      ?.map((m) => m.mood?.displayName)
      .filter((d): d is string => Boolean(d?.trim()))
      .map((displayName) => ({ displayName })) ?? [];

  const photos = photoRows.map((p) => ({
    id: p.id,
    url: p.photoUrl,
    order: p.order,
    isVerified: p.isVerified,
  }));

  return {
    photos,
    location: mapPublicLocation(locRow),
    goals,
    interests,
    professions,
    sessionGoal: statusRow?.sessionGoal?.trim() || null,
    moods,
  };
}

export async function getPublicProfileByUsername(
  viewerId: string,
  rawUsername: string,
): Promise<PublicProfileResult | null> {
  const username = rawUsername.trim().toLowerCase();
  if (!username) return null;

  const target = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: {
      id: true,
      name: true,
      displayName: true,
      image: true,
      isBanned: true,
      username: true,
    },
    with: {
      profile: {
        columns: {
          id: true,
          bio: true,
          age: true,
          gender: true,
          purpose: true,
          educationLevel: true,
          profession: true,
          personalityTags: true,
        },
      },
    },
  });

  if (!target || target.isBanned !== "no" || !target.username) {
    return null;
  }

  if (target.id !== viewerId) {
    const blocked = await userBlocksRepository.isEitherBlocked(viewerId, target.id);
    if (blocked) return null;
  }

  const conn = await userConnectionsRepository.findUndirected(viewerId, target.id);
  let connectionState: PublicProfileConnectionState = "none";
  if (conn) {
    if (conn.status === "accepted") {
      connectionState = "accepted";
    } else if (conn.status === "pending") {
      connectionState =
        conn.requesterId === viewerId ? "pending_outgoing" : "pending_incoming";
    } else {
      connectionState = conn.status;
    }
  }

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

  const extras = prof?.id ? await loadProfileExtras(prof.id) : emptyExtras;

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
    isViewer: target.id === viewerId,
  };
}
