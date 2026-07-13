import type { PublicProfileData } from "../types/public-profile.types";
import type { PublicProfilePeer } from "../types/public-profile-actions.types";

export function publicProfileDisplayTitle(profile: PublicProfileData): string {
  return profile.displayName?.trim() || profile.name;
}

export function publicProfilePrimaryImage(profile: PublicProfileData): string | null {
  return profile.image ?? profile.photos[0]?.url ?? null;
}

export function publicProfilePeerFromData(profile: PublicProfileData): PublicProfilePeer {
  return {
    userId: profile.userId,
    username: profile.username,
    displayTitle: publicProfileDisplayTitle(profile),
    primaryImage: publicProfilePrimaryImage(profile),
  };
}
