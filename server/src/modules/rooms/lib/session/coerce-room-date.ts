/** Drizzle/pg may return timestamps as strings (e.g. `max(left_at)` aggregates). */
export function coerceRoomDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
