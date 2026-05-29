import type { ActiveCircleItem } from "../types/circles-api.types";

export function dedupeCircles(items: ActiveCircleItem[]): ActiveCircleItem[] {
  const seen = new Set<string>();
  const out: ActiveCircleItem[] = [];
  for (const c of items) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}
