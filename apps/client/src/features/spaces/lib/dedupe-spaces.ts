import type { ActiveSpaceItem } from "../types/spaces-api.types";

export function dedupeSpaces(items: ActiveSpaceItem[]): ActiveSpaceItem[] {
  const seen = new Set<string>();
  const out: ActiveSpaceItem[] = [];
  for (const c of items) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}
