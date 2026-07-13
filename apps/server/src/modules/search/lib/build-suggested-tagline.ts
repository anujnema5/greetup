export function buildSuggestedTagline(input: {
  professionDisplayName: string | null;
  sharedInterestLabels: string[];
  bio: string | null;
}): string {
  const { professionDisplayName, sharedInterestLabels, bio } = input;
  const interestBit = sharedInterestLabels.slice(0, 2).join(" · ");

  if (professionDisplayName && interestBit) {
    return `${professionDisplayName} · ${interestBit}`;
  }
  if (professionDisplayName) return professionDisplayName;
  if (interestBit) return interestBit;

  const trimmedBio = bio?.trim();
  if (trimmedBio && trimmedBio.length > 0) {
    return trimmedBio.length > 72 ? `${trimmedBio.slice(0, 69)}…` : trimmedBio;
  }

  return "On Greetup";
}
