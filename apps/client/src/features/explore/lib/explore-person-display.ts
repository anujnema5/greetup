import type { SuggestedPersonItem } from "../types/suggested-people.types";

export function suggestedPersonDisplayLabel(person: {
  displayName: string | null;
  name: string;
}): string {
  return person.displayName?.trim() || person.name;
}

export function suggestedPersonProfileHref(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

export function suggestedPersonSearchHaystack(person: SuggestedPersonItem): string {
  const label = suggestedPersonDisplayLabel(person);
  return [label, person.name, person.username, person.tagline]
    .join(" ")
    .toLowerCase();
}
