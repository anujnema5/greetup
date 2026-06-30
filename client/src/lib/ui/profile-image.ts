import { buildDefaultProfileAvatarUrl } from "@/lib/avatar";

const DEFAULT_PROFILE_IMAGE_URL = buildDefaultProfileAvatarUrl();

export function getProfileImageUrl(imageUrl?: string | null): string {
  const trimmed = imageUrl?.trim();
  return trimmed ? trimmed : DEFAULT_PROFILE_IMAGE_URL;
}
