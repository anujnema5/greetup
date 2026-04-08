const DEFAULT_PROFILE_IMAGE_URL =
  "https://api.dicebear.com/9.x/adventurer-neutral/png?seed=circlo-default-profile";

export function getProfileImageUrl(imageUrl?: string | null): string {
  const trimmed = imageUrl?.trim();
  return trimmed ? trimmed : DEFAULT_PROFILE_IMAGE_URL;
}

