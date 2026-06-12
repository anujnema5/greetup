export function resolveGuestDisplayName(
  displayName: string | null | undefined,
  name: string | null | undefined,
): string | null {
  const fromDisplay = displayName?.trim();
  if (fromDisplay) return fromDisplay;
  const fromName = name?.trim();
  if (fromName && fromName.toLowerCase() !== "guest") return fromName;
  return null;
}
