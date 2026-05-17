function toIsoOrNull(value: Date | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** GET `/room/:id` — client session warnings + countdown. */
export function roomSessionTimingPayload(room: {
  startedAt?: Date | null;
  expiresAt?: Date | null;
}): { startedAt: string | null; expiresAt: string | null } {
  return {
    startedAt: toIsoOrNull(room.startedAt),
    expiresAt: toIsoOrNull(room.expiresAt),
  };
}
