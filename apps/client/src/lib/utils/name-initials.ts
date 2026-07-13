/** Up to two letters for avatar fallbacks (first + last word, or first two chars). */
export function nameInitials(displayNameOrName: string): string {
  const trimmed = displayNameOrName.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}
