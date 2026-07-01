export function getProfileImageUrl(imageUrl?: string | null): string | null {
  const trimmed = imageUrl?.trim();
  return trimmed ? trimmed : null;
}
