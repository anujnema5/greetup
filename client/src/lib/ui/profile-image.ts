export function getProfileImageUrl(imageUrl?: string | null): string | undefined {
  const trimmed = imageUrl?.trim();
  return trimmed || undefined;
}
