const AVATAR_CLASSES = [
  "explore-avatar-indigo",
  "explore-avatar-blue",
  "explore-avatar-teal",
  "explore-avatar-amber",
  "explore-avatar-rose",
] as const;

function hashKey(key: string): number {
  return key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function exploreAvatarClass(key: string): string {
  return AVATAR_CLASSES[hashKey(key) % AVATAR_CLASSES.length] ?? AVATAR_CLASSES[0];
}
