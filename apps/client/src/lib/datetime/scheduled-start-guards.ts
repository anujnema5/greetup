/** Parse ISO scheduled start to epoch ms, or null if missing/invalid. */
export function parseScheduledStartMs(iso: string | null | undefined): number | null {
  if (!iso || typeof iso !== "string" || iso.trim().length === 0) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** True when the client clock is still strictly before the scheduled start instant. */
export function isClientStillBeforeScheduledStart(iso: string | null | undefined): boolean {
  const t = parseScheduledStartMs(iso);
  if (t == null) return false;
  return Date.now() < t;
}
